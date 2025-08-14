"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const webviewHtml_1 = require("./webviewHtml");
const modelsProvider_1 = require("./modelsProvider");
const logic_1 = require("./logic");
function activate(context) {
    const financeViewId = 'madlab.financePanel';
    const modelsViewId = 'madlab.models';
    const modelsProvider = new modelsProvider_1.ModelsProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider(modelsViewId, modelsProvider));
    let currentView;
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(financeViewId, {
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
            const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'main.js')));
            const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'styles.css')));
            webview.html = (0, webviewHtml_1.getWebviewContent)({ webview, scriptUri, styleUri, nonce });
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
            };
            webview.postMessage(init);
            webview.onDidReceiveMessage(async (msg) => {
                if (!msg || typeof msg !== 'object')
                    return;
                switch (msg.type) {
                    case 'CALC': {
                        try {
                            const result = (0, logic_1.handleCalc)(msg.payload);
                            webview.postMessage({ type: 'RESULT', payload: result });
                        }
                        catch (err) {
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
    }, { webviewOptions: { retainContextWhenHidden: true } }));
    context.subscriptions.push(vscode.commands.registerCommand('madlab.open', async () => {
        await vscode.commands.executeCommand('workbench.view.extension.madlab');
        await vscode.commands.executeCommand('workbench.views.service.openView', financeViewId, true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('madlab.newModel', async () => {
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
            shares: 100,
        }, null, 2);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(template));
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        if (currentView) {
            currentView.webview.postMessage({ type: 'LOAD_MODEL', payload: JSON.parse(template) });
        }
        modelsProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('madlab.loadModelInternal', async (uri) => {
        try {
            const buf = await vscode.workspace.fs.readFile(uri);
            const text = Buffer.from(buf).toString('utf8');
            const model = JSON.parse(text);
            if (currentView) {
                currentView.webview.postMessage({ type: 'LOAD_MODEL', payload: model });
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load model';
            vscode.window.showErrorMessage(message);
        }
    }));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
