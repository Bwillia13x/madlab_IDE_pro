import * as vscode from 'vscode';
import { getSecret } from '../storage';
import type { RouteHandler } from './types';

// Track theme listeners per webview panel to avoid duplicate registrations
const themeListenerByPanel = new WeakMap<vscode.WebviewPanel, vscode.Disposable>();

function getThemeNameFromKind(kind: vscode.ColorThemeKind): 'light' | 'dark' | 'high-contrast' {
  return kind === vscode.ColorThemeKind.HighContrast
    ? 'high-contrast'
    : kind === vscode.ColorThemeKind.Light
      ? 'light'
      : 'dark';
}

export const systemRoutes: Record<string, RouteHandler> = {
  'llm:available': async (_msg, panel, context) => {
    const key = await getSecret(context, 'openaiApiKey');
    const ok = Boolean(key);
    panel.webview.postMessage({ type: 'llm:available', payload: { ok } });
  },
  'webview:ready': async (_msg, panel, context) => {
    const ready = { type: 'extension:ready', payload: { version: 1, extensionId: context.extension.id } };
    panel.webview.postMessage(ready);
    try {
      const theme = getThemeNameFromKind(vscode.window.activeColorTheme.kind);
      panel.webview.postMessage({ type: 'theme:data', payload: { theme } });

      // Register a VS Code theme change listener for this panel if not already present
      if (!themeListenerByPanel.has(panel)) {
        const listener = vscode.window.onDidChangeActiveColorTheme((evt) => {
          try {
            const nextTheme = getThemeNameFromKind(evt.kind);
            panel.webview.postMessage({ type: 'theme:data', payload: { theme: nextTheme } });
          } catch {}
        });
        themeListenerByPanel.set(panel, listener);
        context.subscriptions.push(listener);
        // Ensure disposal when the panel is closed
        panel.onDidDispose(() => {
          const d = themeListenerByPanel.get(panel);
          try { d?.dispose(); } catch {}
          themeListenerByPanel.delete(panel);
        });
      }
    } catch {}
  },
  'ping': async (_msg, panel) => {
    panel.webview.postMessage({ type: 'pong', payload: { when: Date.now() } });
  },
  'theme:get': async (_msg, panel) => {
    try {
      const theme = getThemeNameFromKind(vscode.window.activeColorTheme.kind);
      panel.webview.postMessage({ type: 'theme:data', payload: { theme } });
    } catch {
      panel.webview.postMessage({ type: 'theme:data', payload: { theme: 'dark' } });
    }
  },
  'notification:show': async (msg, _panel) => {
    try {
      const { message, type = 'info' } = msg.payload as any;
      const map: Record<string, (s: string) => Thenable<string | undefined>> = {
        info: vscode.window.showInformationMessage,
        warning: vscode.window.showWarningMessage,
        error: vscode.window.showErrorMessage,
        success: vscode.window.showInformationMessage,
      } as any;
      const show = map[type] || vscode.window.showInformationMessage;
      await show(String(message || ''));
    } catch {}
  },
};


