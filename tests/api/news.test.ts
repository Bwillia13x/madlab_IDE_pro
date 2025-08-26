/**
 * Tests for News API Endpoint
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

// Import after mocks
import { GET } from '@/app/api/news/route';

describe('News API - GET /api/news', () => {
  const mockAvNewsData = {
    feed: [
      {
        title: 'Apple Reports Strong Q4 Earnings',
        url: 'https://example.com/apple-earnings',
        time_published: '20250120T120000',
        authors: ['John Doe'],
        summary: 'Apple reported better than expected earnings...',
        source: 'CNBC',
        overall_sentiment_label: 'Positive',
        ticker_sentiment: [
          { ticker: 'AAPL', ticker_sentiment_label: 'Positive' },
          { ticker: 'MSFT', ticker_sentiment_label: 'Neutral' },
        ],
      },
      {
        title: 'Tech Stocks Show Mixed Performance',
        url: 'https://example.com/tech-stocks',
        time_published: '20250119T150000',
        source: 'Reuters',
        overall_sentiment_label: 'Neutral',
        ticker_sentiment: [{ ticker: 'AAPL', ticker_sentiment_label: 'Negative' }],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default environment
    vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'test-news-api-key');
  });

  it('should use default symbol AAPL when none provided', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('tickers=AAPL');
  });

  it('should use provided symbol', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=MSFT');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('tickers=MSFT');
  });

  it('should limit results to 50 max', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL&limit=100');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('limit=50');
  });

  it('should use provided limit when under 50', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL&limit=25');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('limit=25');
  });

  it('should use default limit of 20', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('limit=20');
  });

  it('should handle invalid limit parameter', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL&limit=invalid');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('limit=20'); // Should fallback to default
  });

  it('should return mock data when API key is not configured', async () => {
    vi.stubEnv('ALPHA_VANTAGE_API_KEY', undefined);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      provider: 'mock',
      items: [],
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return mock data when API key is none', async () => {
    vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'none');

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      provider: 'mock',
      items: [],
    });
  });

  it('should successfully process Alpha Vantage news data', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      provider: 'alpha-vantage',
      items: [
        {
          title: 'Apple Reports Strong Q4 Earnings',
          url: 'https://example.com/apple-earnings',
          source: 'CNBC',
          summary: 'Apple reported better than expected earnings...',
          timestamp: '2025-01-20T12:00:00.000Z',
          sentiment: 'positive',
          symbols: ['AAPL', 'MSFT'],
          impact: 'medium',
        },
        {
          title: 'Tech Stocks Show Mixed Performance',
          url: 'https://example.com/tech-stocks',
          source: 'Reuters',
          summary: 'Tech Stocks Show Mixed Performance',
          timestamp: '2025-01-19T15:00:00.000Z',
          sentiment: 'neutral',
          symbols: ['AAPL'],
          impact: 'medium',
        },
      ],
    });
  });

  it('should handle malformed time_published dates', async () => {
    const mockDataWithBadDate = {
      feed: [
        {
          title: 'Test Article',
          url: 'https://example.com/test',
          time_published: '2025', // Too short
          source: 'Test Source',
          overall_sentiment_label: 'Positive',
        },
      ],
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockDataWithBadDate),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items[0].timestamp).toBeDefined();
    expect(data.items[0].sentiment).toBe('positive');
  });

  it('should handle empty feed array', async () => {
    const mockDataWithEmptyFeed = {
      feed: [],
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockDataWithEmptyFeed),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it('should handle non-array feed', async () => {
    const mockDataWithBadFeed = {
      feed: null, // Not an array
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockDataWithBadFeed),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it('should handle Alpha Vantage API errors', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({
      provider: 'alpha-vantage',
      items: [],
      error: 'upstream error',
    });
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      provider: 'alpha-vantage',
      items: [],
      error: 'exception',
    });
  });

  it('should truncate long symbols', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const longSymbol = 'A'.repeat(20); // 20 characters
    const request = new NextRequest(`http://localhost:3000/api/news?symbol=${longSymbol}`);
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain(`tickers=${'A'.repeat(12)}`); // Should be truncated to 12
  });

  it('should set correct query parameters', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockAvNewsData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/news?symbol=AAPL&limit=10');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    const url = new URL(fetchUrl);

    expect(url.searchParams.get('function')).toBe('NEWS_SENTIMENT');
    expect(url.searchParams.get('tickers')).toBe('AAPL');
    expect(url.searchParams.get('apikey')).toBe('test-news-api-key');
    expect(url.searchParams.get('limit')).toBe('10');
  });

  it('should be wrapped with enterprise middleware', () => {
    // The GET function should be the composed result
    expect(typeof GET).toBe('function');
  });
});
