import type { RouteHandler } from './types';

export const workspaceRoutes: Record<string, RouteHandler> = {
  'workspace:get': async (_msg, panel, context) => {
    const data = context.globalState.get('madlab-workspace-data');
    panel.webview.postMessage({ type: 'workspace:data', payload: { data: data || null } });
  },
  'workspace:sync': async (msg, _panel, context) => {
    try { await context.globalState.update('madlab-workspace-data', msg.payload.data); } catch { /* noop */ }
  },
};


