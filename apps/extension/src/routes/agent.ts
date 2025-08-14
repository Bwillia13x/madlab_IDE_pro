import * as vscode from 'vscode';
import type { RouteHandler } from './types';
import { getSecret } from '../storage';

async function mockAgentResponse(message: string, history: any[]): Promise<string> {
  const responses = [
    'I can help you with workspace management and data analysis.',
    'Try asking me to create a new sheet or add widgets to your workspace.',
    'I can assist with financial calculations and data visualization.',
    'Would you like me to help you organize your analysis workflow?',
  ];
  const hash = message.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  const responseIndex = Math.abs(hash) % responses.length;
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
  return responses[responseIndex];
}

const handleAgentRequest: RouteHandler = async (msg, panel) => {
  const { message, history } = msg.payload;
  try {
    const response = await mockAgentResponse(message, history);
    panel.webview.postMessage({ type: 'agent:response', payload: { response } });
  } catch (error) {
    panel.webview.postMessage({ type: 'agent:response', payload: { response: 'Sorry, I encountered an error processing your request.', error: error instanceof Error ? error.message : 'Unknown error' } });
  }
};

const handleAgentPlan: RouteHandler = async (msg, panel) => {
  const { text } = msg.payload as any;
  const t = String(text || '').toLowerCase();
  let plan: any = {};
  const lineFor = t.match(/line\s+chart\s+for\s+([a-z]{1,12})(?:\s*\((1d|5d|1m|3m|6m|1y|2y|5y|max)\))?/);
  if (lineFor) {
    const symbol = lineFor[1].toUpperCase();
    const range = (lineFor[2]?.toUpperCase() || '6M');
    plan = { name: 'add_widget', args: { type: 'line-chart', title: `Line: ${symbol}`, props: { symbol, range } } };
  }
  panel.webview.postMessage({ type: 'agent:response', payload: { response: JSON.stringify(plan) } });
};

const handleAgentLlm: RouteHandler = async (msg, panel, context) => {
  try {
    const { prompt, tools } = msg.payload as any;
    const openaiKey = await getSecret(context, 'openaiApiKey');
    if (!openaiKey) {
      panel.webview.postMessage({ type: 'agent:llm', payload: { error: 'OpenAI key not configured' } });
      return;
    }
    const body = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: String(prompt || '') }],
      tools: Array.isArray(tools) ? tools : undefined,
    };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    } as any);
    const result = await res.json();
    panel.webview.postMessage({ type: 'agent:llm', payload: result });
  } catch (error) {
    panel.webview.postMessage({ type: 'agent:llm', payload: { error: error instanceof Error ? error.message : 'Unknown error' } });
  }
};

export const agentRoutes: Record<string, RouteHandler> = {
  'agent:request': handleAgentRequest,
  'agent:plan': handleAgentPlan,
  'agent:llm': handleAgentLlm,
};


