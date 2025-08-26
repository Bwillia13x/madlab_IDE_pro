/**
 * Tests for Documentation API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the OpenAPI generation functions
vi.mock('@/lib/documentation/openapi', () => ({
  generateOpenAPISpecJSON: vi.fn(),
  generateOpenAPISpecYAML: vi.fn(),
}));

// Import after mocks
import { GET, POST } from '@/app/api/docs/route';
import { generateOpenAPISpecJSON, generateOpenAPISpecYAML } from '@/lib/documentation/openapi';

const mockGenerateOpenAPISpecJSON = vi.mocked(generateOpenAPISpecJSON);
const mockGenerateOpenAPISpecYAML = vi.mocked(generateOpenAPISpecYAML);

describe('Documentation API', () => {
  const mockJsonSpec = JSON.stringify({
    openapi: '3.0.0',
    info: {
      title: 'MAD LAB API',
      version: '1.0.0',
    },
    paths: {},
  });

  const mockYamlSpec = 'openapi: 3.0.0\ninfo:\n  title: MAD LAB API\n  version: 1.0.0\npaths: {}';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateOpenAPISpecJSON.mockReturnValue(mockJsonSpec);
    mockGenerateOpenAPISpecYAML.mockResolvedValue(mockYamlSpec);
  });

  describe('GET /api/docs', () => {
    it('should return JSON OpenAPI spec by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs');
      const response = await GET(request);
      const data = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
      expect(data).toBe(mockJsonSpec);
      expect(mockGenerateOpenAPISpecJSON).toHaveBeenCalledTimes(1);
    });

    it('should return JSON OpenAPI spec when format=json', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs?format=json');
      const response = await GET(request);
      const data = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(data).toBe(mockJsonSpec);
      expect(mockGenerateOpenAPISpecJSON).toHaveBeenCalledTimes(1);
    });

    it('should return YAML OpenAPI spec when format=yaml', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs?format=yaml');
      const response = await GET(request);
      const data = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json'); // Returns JSON for now
      expect(data).toBe(mockYamlSpec);
      expect(mockGenerateOpenAPISpecYAML).toHaveBeenCalledTimes(1);
    });

    it('should return YAML OpenAPI spec when format=yml', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs?format=yml');
      const response = await GET(request);
      const data = await response.text();

      expect(response.status).toBe(200);
      expect(data).toBe(mockYamlSpec);
      expect(mockGenerateOpenAPISpecYAML).toHaveBeenCalledTimes(1);
    });

    it('should handle OpenAPI generation errors', async () => {
      const error = new Error('OpenAPI generation failed');
      mockGenerateOpenAPISpecJSON.mockImplementation(() => {
        throw error;
      });

      const request = new NextRequest('http://localhost:3000/api/docs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to generate API documentation',
        message: 'OpenAPI generation failed',
      });
    });

    it('should handle unknown errors', async () => {
      mockGenerateOpenAPISpecJSON.mockImplementation(() => {
        throw 'Unknown error';
      });

      const request = new NextRequest('http://localhost:3000/api/docs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to generate API documentation',
        message: 'Unknown error',
      });
    });
  });

  describe('POST /api/docs', () => {
    it('should return JSON OpenAPI spec by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(JSON.parse(mockJsonSpec));
      expect(mockGenerateOpenAPISpecJSON).toHaveBeenCalledTimes(1);
    });

    it('should return JSON OpenAPI spec when format=json', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'json' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(JSON.parse(mockJsonSpec));
      expect(mockGenerateOpenAPISpecJSON).toHaveBeenCalledTimes(1);
    });

    it('should return YAML OpenAPI spec when format=yaml', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'yaml' }),
      });

      const response = await POST(request);
      const data = await response.text();

      expect(response.status).toBe(200);
      expect(data).toBe(mockYamlSpec);
      expect(mockGenerateOpenAPISpecYAML).toHaveBeenCalledTimes(1);
    });

    it('should return YAML OpenAPI spec when format=yml', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'yml' }),
      });

      const response = await POST(request);
      const data = await response.text();

      expect(response.status).toBe(200);
      expect(data).toBe(mockYamlSpec);
      expect(mockGenerateOpenAPISpecYAML).toHaveBeenCalledTimes(1);
    });

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/docs', {
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
        error: 'Failed to generate API documentation',
        message: expect.any(String),
      });
    });

    it('should handle OpenAPI generation errors in POST', async () => {
      const error = new Error('YAML generation failed');
      mockGenerateOpenAPISpecYAML.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'yaml' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to generate API documentation',
        message: 'YAML generation failed',
      });
    });
  });
});
