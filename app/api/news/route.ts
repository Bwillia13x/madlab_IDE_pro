import { NextRequest, NextResponse } from 'next/server';
import { compose, withAuth, withErrorHandling, withRateLimit, withPerfMetrics } from '@/lib/enterprise/withEnterprise';

type AvNewsItem = {
  title: string;
  url: string;
  time_published: string; // e.g. 20240101T120000
  authors?: string[];
  summary?: string;
  source?: string;
  overall_sentiment_label?: 'Positive' | 'Negative' | 'Neutral';
  ticker_sentiment?: Array<{
    ticker: string;
    ticker_sentiment_label: 'Positive' | 'Negative' | 'Neutral';
  }>;
};

const baseGET = async function GET(req: NextRequest) {
  const { nextUrl } = req;
  const symbol = (nextUrl.searchParams.get('symbol') || 'AAPL').toUpperCase().slice(0, 12);
  const limit = Math.min(parseInt(nextUrl.searchParams.get('limit') || '20', 10) || 20, 50);

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  const useAlpha = apiKey && apiKey !== 'none';

  try {
    if (!useAlpha) {
      return NextResponse.json({ provider: 'mock', items: [] });
    }

    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'NEWS_SENTIMENT');
    url.searchParams.set('tickers', symbol);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('limit', String(limit));

    const resp = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!resp.ok) {
      return NextResponse.json({ provider: 'alpha-vantage', items: [], error: 'upstream error' }, { status: 502 });
    }
    const data = await resp.json();
    const raw: AvNewsItem[] = Array.isArray(data?.feed) ? data.feed.slice(0, limit) : [];
    const items = raw.map((n) => ({
      title: n.title,
      url: n.url,
      source: n.source || 'alpha-vantage',
      summary: n.summary || '',
      timestamp: new Date(
        n.time_published?.length >= 8
          ? `${n.time_published.slice(0,4)}-${n.time_published.slice(4,6)}-${n.time_published.slice(6,8)}T${n.time_published.slice(9,11) || '00'}:${n.time_published.slice(11,13) || '00'}:00Z`
          : Date.now()
      ).toISOString(),
      sentiment: (n.overall_sentiment_label || 'Neutral').toLowerCase(),
      symbols: (n.ticker_sentiment || []).map((t) => t.ticker),
      impact: 'medium',
    }));

    return NextResponse.json({ provider: 'alpha-vantage', items });
  } catch {
    return NextResponse.json({ provider: 'alpha-vantage', items: [], error: 'exception' }, { status: 500 });
  }
};

export const GET = compose(
  baseGET,
  (h) => withPerfMetrics(h, 'news_get'),
  (h) => withRateLimit(h, { policyId: 'api_data' }),
  (h) => withAuth(h, { optional: true }),
  withErrorHandling,
);

export const dynamic = 'force-dynamic';
