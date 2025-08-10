import * as vscode from 'vscode';
import { FromWebviewMessage, ToWebviewMessage } from './messaging';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('madlab.openWorkbench', () => {
    const panel = vscode.window.createWebviewPanel(
      'madlabWorkbench',
      'MAD LAB Workbench',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')]
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

    panel.webview.onDidReceiveMessage((msg: FromWebviewMessage) => {
      if (msg.type === 'webview:ready') {
        const ready: ToWebviewMessage = { type: 'extension:ready', payload: { version: 1 } };
        panel.webview.postMessage(ready);
        return;
      }
      if (msg.type === 'ping') {
        const pong: ToWebviewMessage = { type: 'pong', payload: { when: Date.now() } };
        panel.webview.postMessage(pong);
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const webviewRoot = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
  const indexPathFs = path.join(webviewRoot.fsPath, 'index.html');

  let html = fs.readFileSync(indexPathFs, 'utf-8');

  html = rewriteAssetUrls(html, (assetPath) => {
    const clean = assetPath.replace(/^\.\//, '').replace(/^\//, '');
    const onDisk = vscode.Uri.joinPath(webviewRoot, clean);
    return webview.asWebviewUri(onDisk).toString();
  });

  const csp = `
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               img-src ${webview.cspSource} https: data:;
               font-src ${webview.cspSource} https: data:;
               style-src ${webview.cspSource} 'unsafe-inline';
               script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';
               connect-src ${webview.cspSource} https:;
               frame-src ${webview.cspSource};">
  `;

  html = html.replace(/<head>([\s\S]*?)<\/head>/i, (m, headInner) => {
    return `<head>${csp}${bridgeScript()}</head>`;
  });

  return html;
}

function rewriteAssetUrls(html: string, mapUrl: (url: string) => string): string {
  return html.replace(/(src|href)=["'](?!https?:\/\/)([^"']+)["']/g, (_m, attr, url) => {
    return `${attr}="${mapUrl(url)}"`;
  });
}

function bridgeScript(): string {
  return `
    <script>
      (function(){
        const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
        const bridge = {
          post: (type, payload) => vscode && vscode.postMessage({ type, payload }),
          onMessage: (handler) => window.addEventListener('message', (e) => handler(e.data)),
        };
        window.madlabBridge = bridge;
        if (vscode) {
          vscode.postMessage({ type: 'webview:ready', payload: { version: 1 } });
        }
      })();
    </script>
  `;
}
