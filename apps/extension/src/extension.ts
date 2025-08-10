import * as vscode from 'vscode';
import { FromWebviewMessage, ToWebviewMessage } from './messaging';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Storage for workspace state persistence
let globalStorageUri: vscode.Uri;
const WORKSPACE_STORAGE_KEY = 'madlab-workspace-data';

export function activate(context: vscode.ExtensionContext) {
  // Initialize global storage
  globalStorageUri = context.globalStorageUri;

  const disposable = vscode.commands.registerCommand('madlab.openWorkbench', () => {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!ws) {
      vscode.window.showErrorMessage(
        "Open a workspace containing an 'out' folder (run: pnpm build:web)."
      );
      return;
    }
    const outDir = vscode.Uri.joinPath(ws, 'out');

    const panel = vscode.window.createWebviewPanel(
      'madlabWorkbench',
      'MAD LAB Workbench',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [outDir], // Restrict to dist assets folder only
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, outDir);

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
  workspaceRoot: vscode.Uri
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
        const fullPath = path.isAbsolute(filePath)
          ? vscode.Uri.file(filePath)
          : vscode.Uri.joinPath(workspaceRoot, filePath);

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
        const fullPath = path.isAbsolute(filePath)
          ? vscode.Uri.file(filePath)
          : vscode.Uri.joinPath(workspaceRoot, filePath);

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
          if (message._requestId && pendingRequests.has(message._requestId)) {
            const { resolve } = pendingRequests.get(message._requestId);
            pendingRequests.delete(message._requestId);
            resolve(message.payload);
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
