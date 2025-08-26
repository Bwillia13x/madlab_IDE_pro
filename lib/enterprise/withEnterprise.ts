import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/enterprise/auth';
import { rateLimiter } from '@/lib/enterprise/rateLimiter';
import { errorHandler } from '@/lib/enterprise/errorHandler';
import { performanceOptimizer } from '@/lib/enterprise/performance';
import { trackEvent } from '@/lib/utils/errorLogger';

type Handler = (req: NextRequest) => Promise<Response> | Response;

function isFlagEnabled(key: string): boolean {
  try {
    return String(process.env[key]).toLowerCase() === 'true';
  } catch {
    return false;
  }
}

export function withErrorHandling(handler: Handler): Handler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      try {
        await errorHandler.handleError(e, {
          endpoint: req.nextUrl.pathname,
          method: req.method,
        });
        try { trackEvent('api_error', false, { path: req.nextUrl.pathname, method: req.method, message: e.message }); } catch {}
      } catch {}
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

export function withAuth(handler: Handler, opts: { optional?: boolean } = {}): Handler {
  return async (req: NextRequest) => {
    if (!isFlagEnabled('NEXT_PUBLIC_FEATURE_AUTH')) {
      return handler(req);
    }
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : (req.cookies.get('madlab_auth_token')?.value || '');

    if (!token) {
      try { trackEvent('api_auth_unauthorized', false, { path: req.nextUrl.pathname, method: req.method }); } catch {}
      if (opts.optional) return handler(req);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const user = await authManager.validateToken(token);
      if (!user) {
        try { trackEvent('api_auth_unauthorized', false, { path: req.nextUrl.pathname, method: req.method, reason: 'invalid' }); } catch {}
        if (opts.optional) return handler(req);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // We cannot mutate NextRequest to attach user; proceed.
      return handler(req);
    } catch {
      try { trackEvent('api_auth_unauthorized', false, { path: req.nextUrl.pathname, method: req.method, reason: 'error' }); } catch {}
      if (opts.optional) return handler(req);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  };
}

export function withRateLimit(
  handler: Handler,
  opts: { policyId?: string } = {}
): Handler {
  return async (req: NextRequest) => {
    if (!isFlagEnabled('NEXT_PUBLIC_FEATURE_RATELIMIT')) {
      return handler(req);
    }
    const policyId = opts.policyId || 'api_standard';
    const fwd = req.headers.get('x-forwarded-for') || '';
    const ip = (fwd.split(',')[0] || req.headers.get('x-real-ip') || '').trim() || 'unknown';
    try {
      const rateLimitInfo = rateLimiter.getRateLimitInfo(policyId);
      const allowed = rateLimiter.canMakeRequest(policyId);
      if (allowed) {
        rateLimiter.recordRequest(policyId);
      }
      const result = { allowed, retryAfter: allowed ? 0 : rateLimitInfo.resetIn, policy: policyId };
      if (!result.allowed) {
        try { trackEvent('api_rate_limit_block', false, { path: req.nextUrl.pathname, method: req.method, policy: result.policy, retryAfter: result.retryAfter }); } catch {}
        return NextResponse.json(
          { error: 'Rate limit exceeded', policy: result.policy, retryAfter: result.retryAfter },
          { status: 429, headers: result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {} }
        );
      }
    } catch {
      // Degrade gracefully if limiter storage is unavailable on server
    }
    return handler(req);
  };
}

export function withPerfMetrics(handler: Handler, name?: string): Handler {
  return async (req: NextRequest) => {
    const start = Date.now();
    const res = await handler(req);
    const duration = Date.now() - start;
    try {
      performanceOptimizer.addMetric({
        id: `${name || req.nextUrl.pathname}_${start}`,
        name: 'api_response_time_ms',
        value: duration,
        unit: 'ms',
        timestamp: start,
        category: 'custom',
        metadata: { path: req.nextUrl.pathname, method: req.method },
      });
    } catch {}
    return res;
  };
}

export function compose(handler: Handler, ...wrappers: Array<(h: Handler) => Handler>): Handler {
  return wrappers.reduceRight((h, w) => w(h), handler);
}
