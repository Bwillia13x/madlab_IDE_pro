import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RouteHandler } from '@/apps/extension/src/routes/types';
import { systemRoutes } from '@/apps/extension/src/routes/system';

// Minimal VS Code API mock
vi.mock('vscode', () => {
  const subscribers: Array<(e: { kind: number }) => void> = [];
  return {
    window: {
      activeColorTheme: { kind: 2 }, // Dark by default
      ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
      onDidChangeActiveColorTheme: (cb: (e: { kind: number }) => void) => {
        subscribers.push(cb);
        return { dispose: () => {} };
      },
      showInformationMessage: vi.fn(async (_msg: string) => undefined),
      showWarningMessage: vi.fn(async (_msg: string) => undefined),
      showErrorMessage: vi.fn(async (_msg: string) => undefined),
      _emitTheme(kind: number) {
        for (const cb of subscribers) cb({ kind });
      },
    },
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
  };
});

type PanelParam = Parameters<RouteHandler>[1];

describe('extension system routes', () => {
  let posted: any[];
  let panel: PanelParam;
  let context: Parameters<RouteHandler>[2];

  beforeEach(() => {
    posted = [];
    panel = {
      webview: {
        postMessage: (msg: unknown) => {
          posted.push(msg);
          return Promise.resolve(true);
        },
      },
      onDidDispose: (_cb: () => void) => {
        // noop for tests
      },
    } as unknown as PanelParam;
    context = {
      extension: { id: 'test.extension' },
      subscriptions: [],
    } as unknown as Parameters<RouteHandler>[2];
  });

  it('posts theme:data on webview:ready', async () => {
    await systemRoutes['webview:ready']({ type: 'webview:ready', payload: { version: 1 } }, panel, context);
    const themeMsg = posted.find((m) => m?.type === 'theme:data');
    expect(themeMsg).toBeTruthy();
    expect(themeMsg.payload).toEqual({ theme: 'dark' });
  });

  it('pushes theme:data on VS Code theme changes after ready', async () => {
    const vscode: any = await import('vscode');
    await systemRoutes['webview:ready']({ type: 'webview:ready', payload: { version: 1 } }, panel, context);
    posted.length = 0; // clear after initial ready push
    vscode.window._emitTheme(vscode.ColorThemeKind.Light);
    // allow listener to run
    await new Promise((r) => setTimeout(r, 0));
    const themeMsg = posted.find((m) => m?.type === 'theme:data');
    expect(themeMsg).toBeTruthy();
    expect(themeMsg.payload).toEqual({ theme: 'light' });
  });

  it('responds to theme:get with theme:data', async () => {
    await systemRoutes['theme:get']({ type: 'theme:get', payload: {} }, panel, context);
    const last = posted[posted.length - 1];
    expect(last.type).toBe('theme:data');
    expect(last.payload).toEqual({ theme: 'dark' });
  });

  it('shows notifications for notification:show', async () => {
    const vscode: any = await import('vscode');
    await systemRoutes['notification:show']({ type: 'notification:show', payload: { message: 'hi', type: 'warning' } }, panel, context);
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('hi');
  });
});


