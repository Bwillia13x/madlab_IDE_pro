import * as vscode from 'vscode';
import { FromWebviewMessage, ToWebviewMessage } from './messaging';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Storage for workspace state persistence
let globalStorageUri: vscode.Uri;
const WORKSPACE_STORAGE_KEY = 'madlab-workspace-data';

export function activate(context: vscode.ExtensionContext) {
  // Register secret-setting commands (Batch 04)
  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.setAlphaVantageKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter Alpha Vantage API Key',
        ignoreFocusOut: true,
        password: true,
      });
      if (!key) return;
      await context.secrets.store('alphaVantageApiKey', key);
      vscode.window.showInformationMessage('Alpha Vantage API key saved to SecretStorage.');
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.setYahooKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter Yahoo API Key (if applicable)',
        ignoreFocusOut: true,
        password: true,
      });
      if (!key) return;
      await context.secrets.store('yahooApiKey', key);
      vscode.window.showInformationMessage('Yahoo API key saved to SecretStorage.');
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.clearApiKeys', async () => {
      await context.secrets.delete('alphaVantageApiKey');
      await context.secrets.delete('yahooApiKey');
      vscode.window.showInformationMessage('MAD LAB: API keys cleared.');
    })
  );
  // Initialize global storage
  globalStorageUri = context.globalStorageUri;

  const disposable = vscode.commands.registerCommand('madlab.openWorkbench', async () => {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri;
    const outDir = ws ? vscode.Uri.joinPath(ws, 'out') : undefined;
    const bundledWebview = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview');

    let webviewRoot: vscode.Uri | undefined = undefined;
    // Prefer workspace /out if it exists, otherwise fall back to bundled assets
    try {
      if (outDir) {
        await vscode.workspace.fs.stat(outDir);
        webviewRoot = outDir;
      }
    } catch {
      // ignore
    }
    if (!webviewRoot) {
      try {
        await vscode.workspace.fs.stat(bundledWebview);
        webviewRoot = bundledWebview;
      } catch {
        vscode.window.showErrorMessage(
          "MAD LAB: Could not find webview assets. Run 'pnpm build:webview' first."
        );
        return;
      }
    }

    const panel = vscode.window.createWebviewPanel(
      'madlabWorkbench',
      'MAD LAB Workbench',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [webviewRoot!], // Restrict to resolved assets folder only
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, webviewRoot!);

    // Enhanced message handling
    panel.webview.onDidReceiveMessage(async (msg: FromWebviewMessage) => {
      try {
        await handleWebviewMessage(msg, panel, context, ws);
      } catch (error) {
        console.error('Error handling webview message:', error);
        vscode.window.showErrorMessage(
          `MAD LAB: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Handle panel disposal
    panel.onDidDispose(() => {
      // Clean up any resources if needed
    });
  });

  context.subscriptions.push(disposable);
}

async function handleWebviewMessage(
  msg: FromWebviewMessage,
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  workspaceRoot?: vscode.Uri
) {
  // Extract request ID for response correlation
  const requestId = (msg.payload as any)?._requestId;

  const sendResponse = (type: string, payload: any) => {
    const responsePayload = requestId ? { ...payload, _requestId: requestId } : payload;
    panel.webview.postMessage({ type, payload: responsePayload });
  };

  switch (msg.type) {
    case 'webview:ready': {
      const ready: ToWebviewMessage = {
        type: 'extension:ready',
        payload: {
          version: 1,
          extensionId: context.extension.id,
        },
      };
      panel.webview.postMessage(ready);
      break;
    }

    case 'ping': {
      const pong: ToWebviewMessage = { type: 'pong', payload: { when: Date.now() } };
      panel.webview.postMessage(pong);
      break;
    }

    case 'workspace:get': {
      const workspaceData = await loadWorkspaceData(context);
      sendResponse('workspace:data', { data: workspaceData });
      break;
    }

    case 'workspace:sync': {
      const success = await saveWorkspaceData(context, msg.payload.data);
      // We could send a confirmation, but for now just log success
      if (!success) {
        console.warn('Failed to sync workspace data');
      }
      break;
    }

    case 'file:save': {
      const { path: filePath, content } = msg.payload;
      try {
        let fullPath: vscode.Uri;
        if (path.isAbsolute(filePath)) {
          fullPath = vscode.Uri.file(filePath);
        } else if (workspaceRoot) {
          fullPath = vscode.Uri.joinPath(workspaceRoot, filePath);
        } else {
          throw new Error('No workspace open to resolve relative path');
        }

        await vscode.workspace.fs.writeFile(fullPath, new TextEncoder().encode(content));
        sendResponse('file:saved', { success: true, path: filePath });
      } catch (error) {
        sendResponse('file:saved', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      break;
    }

    case 'file:open': {
      const { path: filePath } = msg.payload;
      try {
        let fullPath: vscode.Uri;
        if (path.isAbsolute(filePath)) {
          fullPath = vscode.Uri.file(filePath);
        } else if (workspaceRoot) {
          fullPath = vscode.Uri.joinPath(workspaceRoot, filePath);
        } else {
          throw new Error('No workspace open to resolve relative path');
        }

        const fileData = await vscode.workspace.fs.readFile(fullPath);
        const content = new TextDecoder().decode(fileData);
        sendResponse('file:opened', { success: true, content });
      } catch (error) {
        sendResponse('file:opened', {
          success: false,
          error: error instanceof Error ? error.message : 'File not found',
        });
      }
      break;
    }

    case 'theme:get': {
      const theme =
        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
          ? 'dark'
          : vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast
            ? 'high-contrast'
            : 'light';

      sendResponse('theme:data', { theme });
      break;
    }

    case 'notification:show': {
      const { message, type = 'info' } = msg.payload;
      switch (type) {
        case 'error':
          vscode.window.showErrorMessage(message);
          break;
        case 'warning':
          vscode.window.showWarningMessage(message);
          break;
        default:
          vscode.window.showInformationMessage(message);
      }
      break;
    }

    case 'agent:request': {
      // Simple mock agent response for now
      // In a real implementation, this could integrate with language models
      const { message, history } = msg.payload;
      try {
        const response = await mockAgentResponse(message, history);
        sendResponse('agent:response', { response });
      } catch (error) {
        sendResponse('agent:response', {
          response: 'Sorry, I encountered an error processing your request.',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      break;
    }

    case 'data:quote': {
      const { symbol } = msg.payload as any;
      const data = await fetchQuote(symbol);
      sendResponse('data:quote', data);
      break;
    }
    case 'data:prices': {
      const { symbol, range = '6M' } = msg.payload as any;
      const data = await fetchPrices(symbol, range);
      sendResponse('data:prices', data);
      break;
    }
    case 'data:kpis': {
      const { symbol } = msg.payload as any;
      const data = await fetchKpis(symbol);
      sendResponse('data:kpis', data);
      break;
    }
    case 'data:financials': {
      const { symbol } = msg.payload as any;
      const data = await fetchFinancials(symbol);
      sendResponse('data:financials', data);
      break;
    }
    case 'data:vol': {
      const { symbol } = msg.payload as any;
      const data = await fetchVol(symbol);
      sendResponse('data:vol', data);
      break;
    }

    default:
      console.warn('Unknown message type:', (msg as any).type);
  }
}

async function loadWorkspaceData(context: vscode.ExtensionContext): Promise<any> {
  try {
    const data = context.globalState.get(WORKSPACE_STORAGE_KEY);
    return data || null;
  } catch (error) {
    console.error('Failed to load workspace data:', error);
    return null;
  }
}

async function saveWorkspaceData(context: vscode.ExtensionContext, data: any): Promise<boolean> {
  try {
    await context.globalState.update(WORKSPACE_STORAGE_KEY, data);
    return true;
  } catch (error) {
    console.error('Failed to save workspace data:', error);
    return false;
  }
}

async function mockAgentResponse(message: string, history: any[]): Promise<string> {
  // Simple mock response - in production this would integrate with actual AI
  const responses = [
    'I can help you with workspace management and data analysis.',
    'Try asking me to create a new sheet or add widgets to your workspace.',
    'I can assist with financial calculations and data visualization.',
    'Would you like me to help you organize your analysis workflow?',
  ];

  // Simple hash-based selection for consistency
  const hash = message.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  const responseIndex = Math.abs(hash) % responses.length;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

  return responses[responseIndex];
}

export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, webviewRoot: vscode.Uri): string {
  const indexPathFs = path.join(webviewRoot.fsPath, 'index.html');

  let html = fs.readFileSync(indexPathFs, 'utf-8');

  html = rewriteAssetUrls(html, (assetPath) => {
    const clean = assetPath.replace(/^\.\//, '').replace(/^\//, '');
    const onDisk = vscode.Uri.joinPath(webviewRoot, clean);
    return webview.asWebviewUri(onDisk).toString();
  });

  // Generate a nonce for script security
  const nonce = crypto.randomBytes(16).toString('base64');

  // Updated CSP with nonce and tightened directives as per Batch 02 requirements
  const csp = `
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               img-src ${webview.cspSource} data:;
               style-src ${webview.cspSource} 'unsafe-inline';
               script-src 'nonce-${nonce}';
               connect-src ${webview.cspSource} https:;
               font-src ${webview.cspSource};">
  `;

  html = html.replace(/<head>([\s\S]*?)<\/head>/i, (_m, headInner) => {
    return `<head>${csp}${bridgeScript(nonce)}${headInner}</head>`;
  });

  // Add nonce attribute to all existing script tags
  html = addNonceToScriptTags(html, nonce);

  return html;
}

function rewriteAssetUrls(html: string, mapUrl: (url: string) => string): string {
  return html.replace(/(src|href)=["'](?!https?:\/\/)([^"']+)["']/g, (_m, attr, url) => {
    return `${attr}="${mapUrl(url)}"`;
  });
}

function addNonceToScriptTags(html: string, nonce: string): string {
  // Add nonce attribute to script tags that don't already have one
  return html.replace(/<script(?![^>]*nonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
}

function bridgeScript(nonce: string): string {
  return `
    <script nonce="${nonce}">
      (function(){
        const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
        const messageHandlers = new Map();
        let requestId = 0;
        const pendingRequests = new Map();
        
        // Enhanced bridge with promise-based methods
        const bridge = {
          // Basic messaging
          post: (type, payload) => vscode && vscode.postMessage({ type, payload }),
          onMessage: (handler) => window.addEventListener('message', (e) => handler(e.data)),
          
          // Promise-based methods for request/response patterns
          request: (type, payload) => {
            if (!vscode) return Promise.reject(new Error('VS Code API not available'));
            
            return new Promise((resolve, reject) => {
              const id = ++requestId;
              pendingRequests.set(id, { resolve, reject });
              vscode.postMessage({ type, payload: { ...payload, _requestId: id } });
              
              // Timeout after 30 seconds
              setTimeout(() => {
                if (pendingRequests.has(id)) {
                  pendingRequests.delete(id);
                  reject(new Error('Request timeout'));
                }
              }, 30000);
            });
          },
          
          // Workspace methods
          getWorkspace: () => bridge.request('workspace:get', {}),
          syncWorkspace: (data) => {
            if (vscode) {
              vscode.postMessage({ type: 'workspace:sync', payload: { data } });
              return Promise.resolve(true);
            }
            return Promise.resolve(false);
          },
          
          // File operations
          saveFile: (path, content) => bridge.request('file:save', { path, content }),
          openFile: (path) => bridge.request('file:open', { path }),
          
          // Theme
          getTheme: () => bridge.request('theme:get', {}),
          
          // Notifications
          showNotification: (message, type = 'info') => {
            if (vscode) {
              vscode.postMessage({ type: 'notification:show', payload: { message, type } });
            }
          },
          
          // Agent requests
          requestAgent: (message, history = []) => bridge.request('agent:request', { message, history })
        };
        
        // Handle responses to requests
        window.addEventListener('message', (event) => {
          const message = event.data;
          const payload = message?.payload;
          const reqId = payload?._requestId;
          if (reqId && pendingRequests.has(reqId)) {
            const { resolve } = pendingRequests.get(reqId);
            pendingRequests.delete(reqId);
            resolve(payload);
          }
        });
        
        window.madlabBridge = bridge;
        
        if (vscode) {
          vscode.postMessage({ type: 'webview:ready', payload: { version: 1 } });
        }
      })();
    </script>
  `;
}

// Simple in-memory cache with TTL
type CacheEntry<T> = { data: T; ts: number; ttl: number };
const memoryCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const e = memoryCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts < e.ttl) return e.data as T;
  memoryCache.delete(key);
  return null;
}

function setCached<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
  memoryCache.set(key, { data, ts: Date.now(), ttl });
}

// Note: Use simple mock data sources to avoid external dependencies

// Basic free Yahoo endpoints (no key) as placeholder
async function fetchPrices(symbol: string, range: string) {
  const key = `prices:${symbol}:${range}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  // Placeholder: return mock-shaped data to satisfy webview
  const now = Date.now();
  const n = 132;
  const data = Array.from({ length: n }, (_, i) => ({
    date: new Date(now - (n - i - 1) * 86400000).toISOString(),
    open: 100 + Math.sin(i / 10) * 2,
    high: 101 + Math.sin(i / 10) * 2,
    low: 99 + Math.sin(i / 10) * 2,
    close: 100 + Math.sin(i / 10) * 2,
    volume: 1_000_000 + i * 10,
  }));
  setCached(key, data);
  return data;
}

async function fetchQuote(symbol: string) {
  const key = `quote:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const data = {
    symbol,
    price: 100 + Math.random() * 5,
    change: (Math.random() - 0.5) * 2,
    changePercent: (Math.random() - 0.5) * 2,
    timestamp: new Date().toISOString(),
  };
  setCached(key, data, 30_000);
  return data;
}

// Helper to load secrets (without exposing to webview)
async function getSecret(context: vscode.ExtensionContext, key: string) {
  try {
    return await context.secrets.get(key);
  } catch {
    return undefined;
  }
}

async function fetchKpis(symbol: string) {
  const key = `kpis:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const data = {
    symbol,
    name: `${symbol} Corp`,
    price: 123.45,
    change: 1.23,
    changePercent: 1.0,
    volume: 1234567,
    marketCap: 5_000_000_000,
    timestamp: new Date().toISOString(),
  };
  setCached(key, data, 60_000);
  return data;
}

async function fetchFinancials(symbol: string) {
  const key = `fin:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const data = {
    symbol,
    revenue: 1_000_000_000,
    netIncome: 100_000_000,
    cashFlow: 200_000_000,
    fcf: 150_000_000,
    timestamp: new Date().toISOString(),
  };
  setCached(key, data, 5 * 60_000);
  return data;
}

async function fetchVol(symbol: string) {
  const key = `vol:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const points = [7, 14, 30, 60, 90]
    .flatMap((d) =>
      [90, 95, 100, 105, 110].map((strike) => ({
        strike,
        expiry: new Date(Date.now() + d * 86400000).toISOString(),
        impliedVol: 0.2 + (Math.random() - 0.5) * 0.05,
      }))
    )
    .flat();
  const data = { symbol, underlyingPrice: 100, points, timestamp: new Date().toISOString() };
  setCached(key, data, 5 * 60_000);
  return data;
}
