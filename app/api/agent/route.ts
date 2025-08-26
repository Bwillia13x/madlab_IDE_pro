import { NextRequest } from 'next/server';
import { compose, withAuth, withErrorHandling, withRateLimit, withPerfMetrics } from '@/lib/enterprise/withEnterprise';

/**
 * Server-side agent endpoint that proxies to OpenAI or Anthropic based on env.
 * Accepts { message, history } and returns streaming text chunks.
 * Wrapped with enterprise auth/rate-limit/error/perf.
 */

export const runtime = 'edge';

type Provider = 'openai' | 'anthropic';

function pickProvider(): Provider {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  throw new Error('No LLM API key configured');
}

async function basePOST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { message, history } = (await req.json()) as { message: string; history?: Array<{ role: string; content: string }>; };
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid request: message required' }), { status: 400 });
    }
    
    // Validate message length
    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 1000 chars)' }), { status: 400 });
    }

    const provider = pickProvider();

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY as string;
      const body = JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          ...(history || []).map((m) => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content })),
          { role: 'user', content: message },
        ],
        stream: true,
        temperature: 0.2,
      });
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      });
      if (!resp.ok || !resp.body) {
        const text = await resp.text();
        return new Response(text || 'Upstream error', { status: 502 });
      }
      
      // Log successful request
      console.log(`[MADLAB INFO] Agent API: OpenAI request successful`, {
        provider: 'openai',
        messageLength: message.length,
        historyLength: history?.length || 0,
        duration: Date.now() - startTime
      });
      
      return new Response(resp.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Anthropic streaming
    const apiKey = process.env.ANTHROPIC_API_KEY as string;
    const body = JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
      max_tokens: 512,
      messages: [
        ...(history || []).map((m) => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: [{ type: 'text', text: m.content }] })),
        { role: 'user', content: [{ type: 'text', text: message }] },
      ],
      stream: true,
    });
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });
    if (!resp.ok || !resp.body) {
      const text = await resp.text();
      return new Response(text || 'Upstream error', { status: 502 });
    }
    
    // Log successful request
    console.log(`[MADLAB INFO] Agent API: Anthropic request successful`, {
      provider: 'anthropic',
      messageLength: message.length,
      historyLength: history?.length || 0,
      duration: Date.now() - startTime
    });
    
    return new Response(resp.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    const duration = Date.now() - startTime;
    const msg = e instanceof Error ? e.message : 'Agent error';
    
    // Log error
    console.error(`[MADLAB ERROR] Agent API failed`, {
      error: msg,
      duration,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}

export const POST = compose(
  basePOST,
  (h) => withPerfMetrics(h, 'agent_post'),
  (h) => withRateLimit(h, { policyId: 'api_agent' }),
  (h) => withAuth(h, { optional: true }),
  withErrorHandling,
);

