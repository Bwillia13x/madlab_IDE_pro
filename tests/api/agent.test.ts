/**
 * Tests for Agent API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the enterprise middleware
vi.mock('@/lib/enterprise/withEnterprise', () => ({
  compose: vi.fn((...fns: any[]) => fns[0]), // Return the base function for testing
  withAuth: vi.fn(),
  withErrorHandling: vi.fn(),
  withRateLimit: vi.fn(),
  withPerfMetrics: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
console.log = mockConsoleLog;
console.error = mockConsoleError;

// Import after mocks
import { POST } from '@/app/api/agent/route';

describe('Agent API - POST /api/agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    vi.stubEnv('OPENAI_MODEL', 'gpt-4o-mini');
    vi.stubEnv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20240620');
  });

  describe('OpenAI Provider', () => {
    beforeEach(() => {
      vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
      vi.stubEnv('ANTHROPIC_API_KEY', undefined);
    });

    it('should successfully process OpenAI request with streaming response', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello, world!',
          history: [
            { role: 'user', content: 'Hi' },
            { role: 'agent', content: 'Hello!' },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');

      // Verify OpenAI API was called correctly
      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-openai-key',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello!' },
            { role: 'user', content: 'Hello, world!' },
          ],
          stream: true,
          temperature: 0.2,
        }),
      });

      // Verify logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[MADLAB INFO] Agent API: OpenAI request successful',
        expect.objectContaining({
          provider: 'openai',
          messageLength: 13,
          historyLength: 2,
          duration: expect.any(Number),
        })
      );
    });

    it('should return 400 when message is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid request: message required',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return 400 when message is not a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 123,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid request: message required',
      });
    });

    it('should return 400 when message is too long', async () => {
      const longMessage = 'a'.repeat(1001);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: longMessage,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Message too long (max 1000 chars)',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return 502 when OpenAI API fails', async () => {
      const mockResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('API rate limit exceeded'),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.text();

      expect(response.status).toBe(502);
      expect(data).toBe('API rate limit exceeded');
    });

    it('should handle OpenAI API with no response body', async () => {
      const mockResponse = {
        ok: true,
        body: null,
        text: vi.fn().mockResolvedValue('No body'),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.text();

      expect(response.status).toBe(502);
      expect(data).toBe('No body');
    });

    it('should work with empty history', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello!',
        }),
      });

      await POST(request);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.messages).toEqual([{ role: 'user', content: 'Hello!' }]);
    });
  });

  describe('Anthropic Provider', () => {
    beforeEach(() => {
      vi.stubEnv('OPENAI_API_KEY', undefined);
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
    });

    it('should successfully process Anthropic request with streaming response', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello from Claude!',
          history: [
            { role: 'user', content: 'Hi' },
            { role: 'agent', content: 'Hello!' },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');

      // Verify Anthropic API was called correctly
      expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-anthropic-key',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 512,
          messages: [
            { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
            { role: 'assistant', content: [{ type: 'text', text: 'Hello!' }] },
            { role: 'user', content: [{ type: 'text', text: 'Hello from Claude!' }] },
          ],
          stream: true,
        }),
      });

      // Verify logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[MADLAB INFO] Agent API: Anthropic request successful',
        expect.objectContaining({
          provider: 'anthropic',
          messageLength: 17,
          historyLength: 2,
          duration: expect.any(Number),
        })
      );
    });

    it('should return 502 when Anthropic API fails', async () => {
      const mockResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('Invalid API key'),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.text();

      expect(response.status).toBe(502);
      expect(data).toBe('Invalid API key');
    });
  });

  describe('Provider Selection', () => {
    it('should prefer OpenAI when both keys are available', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'openai-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'anthropic-key');

      const mockResponse = {
        ok: true,
        body: new ReadableStream(),
        text: vi.fn().mockResolvedValue(''),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      await POST(request);

      // Should call OpenAI API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should throw error when no API keys are configured', async () => {
      vi.stubEnv('OPENAI_API_KEY', undefined);
      vi.stubEnv('ANTHROPIC_API_KEY', undefined);

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'No LLM API key configured',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.stubEnv('OPENAI_API_KEY', 'test-key');
    });

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: expect.stringContaining('error'),
      });

      // Verify error logging
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[MADLAB ERROR] Agent API failed',
        expect.objectContaining({
          error: expect.any(String),
          duration: expect.any(Number),
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle fetch network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Network error',
      });

      // Verify error logging
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[MADLAB ERROR] Agent API failed',
        expect.objectContaining({
          error: 'Network error',
          duration: expect.any(Number),
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle unknown errors', async () => {
      mockFetch.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Agent error',
      });
    });
  });

  describe('Middleware Integration', () => {
    it('should be wrapped with enterprise middleware', () => {
      // The POST function should be the composed result
      expect(typeof POST).toBe('function');
      // The actual middleware testing would require more complex setup
    });
  });
});
