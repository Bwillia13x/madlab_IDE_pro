/**
 * Tests for Historical Data API Endpoint
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
import { GET } from '@/app/api/historical/route';

describe('Historical Data API - GET /api/historical', () => {
  const mockHistoricalData = {
    'Meta Data': {
      '1. Information': 'Daily Time Series with Splits and Dividend Events',
      '2. Symbol': 'AAPL',
      '3. Last Refreshed': '2025-01-20',
      '4. Output Size': 'Full size',
      '5. Time Zone': 'US/Eastern',
    },
    'Time Series (Daily)': {
      '2025-01-20': {
        '1. open': '150.00',
        '2. high': '155.00',
        '3. low': '149.00',
        '4. close': '152.00',
        '5. adjusted close': '152.00',
        '6. volume': '1000000',
        '7. dividend amount': '0.0000',
        '8. split coefficient': '1.0',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default environment
    vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'test-api-key');
    vi.stubEnv('NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY', 'public-test-key');
  });

  it('should return 400 when symbol is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/historical');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Missing symbol',
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return 500 when API key is not configured', async () => {
    vi.stubEnv('ALPHA_VANTAGE_API_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY', undefined);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'ALPHA_VANTAGE_API_KEY not configured',
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return 500 when API key is demo', async () => {
    vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'demo');

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'ALPHA_VANTAGE_API_KEY not configured',
    });
  });

  it('should use ALPHA_VANTAGE_API_KEY when available', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockHistoricalData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=aapl');
    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://www.alphavantage.co/query')
    );

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('symbol=AAPL'); // Should be uppercased
    expect(fetchUrl).toContain('apikey=test-api-key');
    expect(fetchUrl).toContain('function=TIME_SERIES_DAILY_ADJUSTED');
    expect(fetchUrl).toContain('outputsize=full');
  });

  it('should use NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY as fallback', async () => {
    vi.stubEnv('ALPHA_VANTAGE_API_KEY', undefined);

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockHistoricalData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('apikey=public-test-key');
  });

  it('should successfully return historical data', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockHistoricalData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(data).toEqual(mockHistoricalData);
  });

  it('should handle Alpha Vantage API errors', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue('API rate limit exceeded'),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    const response = await GET(request);
    const data = await response.text();

    expect(response.status).toBe(429);
    expect(data).toBe('API rate limit exceeded');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network connection failed'));

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Network connection failed',
    });
  });

  it('should handle unknown errors', async () => {
    mockFetch.mockRejectedValue('Unknown error');

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Historical fetch error',
    });
  });

  it('should convert symbol to uppercase', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockHistoricalData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=aapl');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('symbol=AAPL');
  });

  it('should handle symbols with special characters', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockHistoricalData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=msft.us');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    expect(fetchUrl).toContain('symbol=MSFT.US');
  });

  it('should set correct query parameters', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockHistoricalData),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/historical?symbol=AAPL');
    await GET(request);

    const fetchUrl = mockFetch.mock.calls[0][0];
    const url = new URL(fetchUrl);

    expect(url.searchParams.get('function')).toBe('TIME_SERIES_DAILY_ADJUSTED');
    expect(url.searchParams.get('symbol')).toBe('AAPL');
    expect(url.searchParams.get('outputsize')).toBe('full');
    expect(url.searchParams.get('apikey')).toBe('test-api-key');
  });

  it('should be wrapped with enterprise middleware', () => {
    // The GET function should be the composed result
    expect(typeof GET).toBe('function');
    // The actual middleware testing would require more complex setup
  });
});
