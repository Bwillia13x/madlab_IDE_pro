import * as vscode from 'vscode';
import { FromWebviewMessage, ToWebviewMessage } from './messaging';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
// network helpers are provided in route modules

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
  // Optional LLM key (Batch 15)
  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.setOpenAIKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter OpenAI API Key',
        ignoreFocusOut: true,
        password: true,
      });
      if (!key) return;
      await context.secrets.store('openaiApiKey', key);
      vscode.window.showInformationMessage('OpenAI API key saved to SecretStorage.');
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

// Delegate some routes to extracted router while preserving existing ones
import { routes } from './routes';

async function handleWebviewMessage(
  msg: FromWebviewMessage,
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  workspaceRoot?: vscode.Uri
) {
  if (routes[msg.type]) {
    return routes[msg.type](msg, panel, context, workspaceRoot);
  }
  // Unknown route: log and ignore
  console.warn('Unknown message type:', (msg as any).type);
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

// Moved helpers to csp.ts and bridge.ts for clarity
import { rewriteAssetUrls, addNonceToScriptTags } from './csp';
import { buildBridgeScript as bridgeScript } from './bridge';

