import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider, type PricePoint, type KpiData, type VolSurface, type CorrelationMatrix } from '@/lib/data/providers';
import { zPriceSeries, zKpiData, zVolSurface } from '@/lib/data/schemas';
import type { PriceRange } from '@/lib/data/providers';
import { serverMetrics, startServerMetricTimer } from '@/lib/metrics/server';
import { withSpan } from '@/lib/otel/instrumentation';
import { detectOutliers, detectGaps } from '@/lib/data/quality';

// Simple in-memory cache with TTL
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = Number(process.env.MARKET_API_MAX_CACHE || 500)

// Simple in-memory token bucket rate limiter per IP (60 req/minute)
type Bucket = { tokens: number; lastRefill: number };
const RATE_LIMIT_CAPACITY = 60;
const RATE_LIMIT_REFILL_RATE_PER_SEC = RATE_LIMIT_CAPACITY / 60; // 1 token/sec
const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const ip = xf.split(',')[0]?.trim();
    if (ip) return ip;
  }
  // Next.js 13 app router doesn't expose remote address directly; fallback
  return req.headers.get('x-real-ip') || 'unknown';
}

function allowRequest(req: NextRequest): boolean {
  if (process.env.DISABLE_RATE_LIMIT === 'true') return true;
  const ip = getClientIp(req);
  const now = Date.now();
  const nowSec = now / 1000;
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_CAPACITY, lastRefill: nowSec };
    buckets.set(ip, bucket);
  }
  // Refill tokens
  const elapsed = Math.max(0, nowSec - bucket.lastRefill);
  const refill = elapsed * RATE_LIMIT_REFILL_RATE_PER_SEC;
  bucket.tokens = Math.min(RATE_LIMIT_CAPACITY, bucket.tokens + refill);
  bucket.lastRefill = nowSec;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

function getCached<T = unknown>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && (Date.now() - entry.timestamp) < entry.ttl) {
    return entry.data as T;
  }
  if (entry) {
    cache.delete(key);
  }
  return null;
}

function setCache<T = unknown>(key: string, data: T, ttlMs: number = 300000): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest entry
    const firstKey = cache.keys().next().value as string | undefined
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(key, {
    data: data as unknown,
    timestamp: Date.now(),
    ttl: ttlMs
  });
}

export async function GET(request: NextRequest) {
  try {
    const timer = startServerMetricTimer('market:GET')
    if (!allowRequest(request)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
    }
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const range = searchParams.get('range') as PriceRange || '6M';
    const type = searchParams.get('type') || 'prices';

    const symbolsParam = searchParams.get('symbols');
    const hasBatchSymbols = !!symbolsParam && ['prices', 'kpis', 'vol'].includes(type);
    const parsedSymbols = hasBatchSymbols
      ? (symbolsParam || '')
          .split(',')
          .map(s => s.trim().toUpperCase())
          .filter(s => /^[A-Z0-9.\-:]{1,10}$/i.test(s))
          .slice(0, 50)
      : [];
    if (!hasBatchSymbols) {
      if (!symbol || !/^[A-Z0-9.\-:]{1,10}$/i.test(symbol)) {
        return NextResponse.json(
          { error: 'Invalid or missing symbol parameter' },
          { status: 400 }
        );
      }
    }

    // Check environment variable for live data
    if (process.env.DISABLE_LIVE_DATA === 'true') {
      return NextResponse.json(
        { error: 'Live data is disabled' },
        { status: 503 }
      );
    }

    // Build a precise cache key per type (normalized)
    let cacheKey = `${type}`;
    if (hasBatchSymbols) {
      const normSymbols = parsedSymbols.slice().sort().join(',');
      if (type === 'prices') {
        cacheKey = `batch:${type}:${normSymbols}:${range}`;
      } else {
        cacheKey = `batch:${type}:${normSymbols}`;
      }
    } else if (type === 'prices') {
      cacheKey = `${type}:${String(symbol).toUpperCase()}:${range}`
    } else if (type === 'kpis' || type === 'vol') {
      cacheKey = `${type}:${String(symbol).toUpperCase()}`
    } else if (type === 'correlation') {
      const symbolsParam = searchParams.get('symbols')?.split(',') || [symbol]
      const normSymbols = symbolsParam.map(s => String(s).toUpperCase()).sort().join(',')
      const period = searchParams.get('period') || '1Y'
      cacheKey = `${type}:${normSymbols}:${period}`
    } else {
      cacheKey = `${type}:${String(symbol).toUpperCase()}:${range}`
    }
    const cached = getCached(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, max-age=60, stale-while-revalidate=60',
          'Vary': 'Accept-Encoding'
        }
      });
    }

    // Get data provider
    const provider = getDataProvider();
    if (!provider) {
      return NextResponse.json(
        { error: 'Data provider not available' },
        { status: 503 }
      );
    }

    let data: unknown;

    const doFetch = async () => {
      if (hasBatchSymbols) {
        // Multi-symbol GET support for prices/kpis/vol
        const out: Record<string, unknown> = {}
        if (type === 'prices') {
          await Promise.all(parsedSymbols.map(async (sym) => {
            out[sym] = await withSpan('market:getPrices', () => provider.getPrices(sym, range))
          }))
          return out
        }
        if (type === 'kpis') {
          await Promise.all(parsedSymbols.map(async (sym) => {
            out[sym] = await withSpan('market:getKpis', () => provider.getKpis(sym))
          }))
          return out
        }
        if (type === 'vol') {
          await Promise.all(parsedSymbols.map(async (sym) => {
            out[sym] = await withSpan('market:getVolSurface', () => provider.getVolSurface(sym))
          }))
          return out
        }
      }
      switch (type) {
      case 'prices':
        return await withSpan('market:getPrices', () => provider.getPrices(String(symbol), range));
      
      case 'kpis':
        return await withSpan('market:getKpis', () => provider.getKpis(String(symbol)));
        
      case 'vol':
        return await withSpan('market:getVolSurface', () => provider.getVolSurface(String(symbol)));
        
      case 'correlation':
        const symbols = searchParams.get('symbols')?.split(',') || [String(symbol)];
        const period = searchParams.get('period') || '1Y';
        if (provider.getCorrelation) {
          return await withSpan('market:getCorrelation', () => provider.getCorrelation!(symbols.map(s => String(s).toUpperCase()), period));
        } else {
          return NextResponse.json(
            { error: 'Correlation data not available' },
            { status: 501 }
          );
        }
        
      default:
        return NextResponse.json(
          { error: `Unknown data type: ${type}` },
          { status: 400 }
        );
    }
    };

    // Server-side request deduplication
    if (inflight.has(cacheKey)) {
      data = await inflight.get(cacheKey);
    } else {
      const p = Promise.resolve(doFetch()).finally(() => inflight.delete(cacheKey));
      inflight.set(cacheKey, p);
      data = await p;
    }

    // Optional data quality checks for prices
    if (type === 'prices' && Array.isArray(data)) {
      try {
        const closes = (data as PricePoint[]).map((p) => Number(p.close)).filter((v) => Number.isFinite(v))
        const dates = (data as PricePoint[]).map((p) => new Date(p.date))
        const issues = [
          ...detectOutliers(closes),
          ...detectGaps(dates),
        ]
        if (issues.length > 0) {
          serverMetrics.inc('market:data_quality:issues', issues.length)
        }
      } catch {}
    }

    // Runtime validation (best-effort, non-blocking)
    try {
      if (type === 'prices' && Array.isArray(data)) {
        zPriceSeries.parse(data)
      } else if (type === 'kpis' && data && typeof data === 'object') {
        zKpiData.parse(data as unknown as KpiData)
      } else if (type === 'vol' && data && typeof data === 'object') {
        zVolSurface.parse(data as unknown as VolSurface)
      }
    } catch {
      serverMetrics.inc('market:data_validation:errors')
    }

    // Cache the result (5 minute TTL)
    setCache(cacheKey, data, 300000);

    const res = NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, max-age=60, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding'
      }
    })
    timer.stop(200)
    return res
    
  } catch (error) {
    console.error('Market data API error:', error);
    serverMetrics.inc('market:GET:errors')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!allowRequest(request)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
    }
    const body = await request.json();
    const { symbols, type = 'batch', range = '6M' } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const invalid = symbols.find((s: unknown) => typeof s !== 'string' || !/^[A-Z0-9.\-:]{1,10}$/i.test(String(s)));
    if (invalid) {
      return NextResponse.json(
        { error: 'One or more symbols are invalid' },
        { status: 400 }
      );
    }

    if (process.env.DISABLE_LIVE_DATA === 'true') {
      return NextResponse.json(
        { error: 'Live data is disabled' },
        { status: 503 }
      );
    }

    const provider = getDataProvider();
    if (!provider) {
      return NextResponse.json(
        { error: 'Data provider not available' },
        { status: 503 }
      );
    }

    // Batch fetch data for multiple symbols
    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    await Promise.allSettled(
      symbols.map(async (symbol: string) => {
        try {
          const sym = String(symbol).toUpperCase()
          const cacheKey = `batch:${sym}:${range}`;
          const cached = getCached(cacheKey);
          
          if (cached) {
            results[sym] = cached;
            return;
          }

          const data = {
            prices: await provider.getPrices(sym, range as PriceRange),
            kpis: await provider.getKpis(sym),
            vol: await provider.getVolSurface(sym)
          };

          setCache(cacheKey, data, 300000);
          results[sym] = data;
        } catch (error) {
          const sym = String(symbol).toUpperCase()
          errors[sym] = error instanceof Error ? error.message : 'Unknown error';
        }
      })
    );

    return NextResponse.json({
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'public, s-maxage=300, max-age=60, stale-while-revalidate=60', 'Vary': 'Accept-Encoding' } });

  } catch (error) {
    console.error('Market data batch API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}