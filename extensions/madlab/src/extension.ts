import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const openCmd = vscode.commands.registerCommand('madlab.open', async () => {
    const view = await vscode.commands.executeCommand('madlab.financePanel.focus');
    return view;
  });

  const provider = new FinanceWebviewProvider(context);
  context.subscriptions.push(
    openCmd,
    vscode.window.registerWebviewViewProvider('madlab.financePanel', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  const treeProvider = new ModelsProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('madlab.models', treeProvider)
  );
}

export function deactivate() {}

class FinanceWebviewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}
  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    const { webview } = webviewView;
    webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css'));
    webview.html = /* html */ `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>MadLab Finance Panel</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;

    webview.onDidReceiveMessage((msg) => {
      // Placeholder message handler
      switch (msg?.type) {
        case 'PING':
          webview.postMessage({ type: 'PONG' });
          break;
      }
    });
  }
}

class ModelsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }
  async getChildren(): Promise<vscode.TreeItem[]> {
    return [new vscode.TreeItem('Sample Model', vscode.TreeItemCollapsibleState.None)];
  }
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

import * as vscode from 'vscode';
import * as path from 'path';
import { getWebviewContent } from './webviewHtml';
import { ModelsProvider } from './modelsProvider';
import { handleCalc } from './logic';

export function activate(context: vscode.ExtensionContext) {
  const containerId = 'madlab';
  const financeViewId = 'madlab.financePanel';
  const modelsViewId = 'madlab.models';

  const modelsProvider = new ModelsProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(modelsViewId, modelsProvider)
  );

  let currentView: vscode.WebviewView | undefined;

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      financeViewId,
      {
        resolveWebviewView: (view) => {
          currentView = view;
          const { webview } = view;
          webview.options = {
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(context.extensionPath, 'media')),
            ],
          };
          const nonce = Date.now().toString(36);
          const scriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(context.extensionPath, 'media', 'main.js'))
          );
          const styleUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(context.extensionPath, 'media', 'styles.css'))
          );
          webview.html = getWebviewContent({ webview, scriptUri, styleUri, nonce });

          const init = {
            type: 'INIT',
            payload: {
              version: '0.0.1',
              defaultModel: {
                fcf0: 100,
                growth: 0.03,
                wacc: 0.1,
                horizon: 5,
                terminalMultiple: 12,
                shares: 100
              }
            }
          } as const;
          webview.postMessage(init);

          webview.onDidReceiveMessage(async (msg) => {
            if (!msg || typeof msg !== 'object') return;
            switch (msg.type) {
              case 'CALC': {
                try {
                  const result = handleCalc(msg.payload);
                  webview.postMessage({ type: 'RESULT', payload: result });
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : 'Unknown error';
                  webview.postMessage({ type: 'ERROR', error: message });
                }
                break;
              }
              case 'LOAD_MODEL': {
                webview.postMessage({ type: 'LOAD_MODEL', payload: msg.payload });
                break;
              }
            }
          });
        }
      },
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.open', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.madlab');
      await vscode.commands.executeCommand('workbench.views.service.openView', financeViewId, true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.newModel', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) {
        vscode.window.showErrorMessage('Open a workspace to create a model');
        return;
      }
      const uri = vscode.Uri.joinPath(ws.uri, 'example.mlab.json');
      const template = JSON.stringify({
        fcf0: 120,
        growth: 0.03,
        wacc: 0.1,
        horizon: 5,
        terminalMultiple: 10,
        shares: 100
      }, null, 2);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(template));
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
      if (currentView) {
        currentView.webview.postMessage({ type: 'LOAD_MODEL', payload: JSON.parse(template) });
      }
      modelsProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('madlab.loadModelInternal', async (uri: vscode.Uri) => {
      try {
        const buf = await vscode.workspace.fs.readFile(uri);
        const text = Buffer.from(buf).toString('utf8');
        const model = JSON.parse(text);
        if (currentView) {
          currentView.webview.postMessage({ type: 'LOAD_MODEL', payload: model });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load model';
        vscode.window.showErrorMessage(message);
      }
    })
  );
}

export function deactivate() {}


