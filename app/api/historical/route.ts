import { NextRequest } from 'next/server';
import { compose, withAuth, withErrorHandling, withRateLimit, withPerfMetrics } from '@/lib/enterprise/withEnterprise';

export const runtime = 'edge';

const baseGET = async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Missing symbol' }), { status: 400 });
    }
    // Normalize env var usage to match other routes
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
    if (!apiKey || apiKey === 'demo') {
      return new Response(JSON.stringify({ error: 'ALPHA_VANTAGE_API_KEY not configured' }), { status: 500 });
    }
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'TIME_SERIES_DAILY_ADJUSTED');
    url.searchParams.set('symbol', symbol.toUpperCase());
    url.searchParams.set('outputsize', 'full');
    url.searchParams.set('apikey', apiKey);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      return new Response(await resp.text(), { status: resp.status });
    }
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Historical fetch error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const GET = compose(
  baseGET,
  (h) => withPerfMetrics(h, 'historical_get'),
  (h) => withRateLimit(h, { policyId: 'api_data' }),
  (h) => withAuth(h, { optional: true }),
  withErrorHandling,
);
