import * as vscode from 'vscode';
import * as path from 'path';
import { getWebviewContent } from './webviewHtml';
import { ModelsProvider } from './modelsProvider';
import { handleCalc } from './logic';

export function activate(context: vscode.ExtensionContext) {
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
                shares: 100,
              },
            },
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
        },
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
      const template = JSON.stringify(
        {
          fcf0: 120,
          growth: 0.03,
          wacc: 0.1,
          horizon: 5,
          terminalMultiple: 10,
          shares: 100,
        },
        null,
        2
      );
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


