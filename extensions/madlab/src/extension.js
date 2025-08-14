"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
var vscode = require("vscode");
function activate(context) {
    var _this = this;
    var openCmd = vscode.commands.registerCommand('madlab.open', function () { return __awaiter(_this, void 0, void 0, function () {
        var view;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, vscode.commands.executeCommand('madlab.financePanel.focus')];
                case 1:
                    view = _a.sent();
                    return [2 /*return*/, view];
            }
        });
    }); });
    var provider = new FinanceWebviewProvider(context);
    context.subscriptions.push(openCmd, vscode.window.registerWebviewViewProvider('madlab.financePanel', provider, {
        webviewOptions: { retainContextWhenHidden: true },
    }));
    var treeProvider = new ModelsProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('madlab.models', treeProvider));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
var FinanceWebviewProvider = /** @class */ (function () {
    function FinanceWebviewProvider(context) {
        this.context = context;
    }
    FinanceWebviewProvider.prototype.resolveWebviewView = function (webviewView) {
        var webview = webviewView.webview;
        webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };
        var nonce = getNonce();
        var scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));
        var styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css'));
        webview.html = /* html */ "\n<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src ".concat(webview.cspSource, " data:; style-src ").concat(webview.cspSource, "; script-src 'nonce-").concat(nonce, "';\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <link href=\"").concat(styleUri, "\" rel=\"stylesheet\" />\n    <title>MadLab Finance Panel</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script nonce=\"").concat(nonce, "\" src=\"").concat(scriptUri, "\"></script>\n  </body>\n</html>");
        webview.onDidReceiveMessage(function (msg) {
            // Placeholder message handler
            switch (msg === null || msg === void 0 ? void 0 : msg.type) {
                case 'PING':
                    webview.postMessage({ type: 'PONG' });
                    break;
            }
        });
    };
    return FinanceWebviewProvider;
}());
var ModelsProvider = /** @class */ (function () {
    function ModelsProvider() {
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.emitter.event;
    }
    ModelsProvider.prototype.getTreeItem = function (element) { return element; };
    ModelsProvider.prototype.getChildren = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, [new vscode.TreeItem('Sample Model', vscode.TreeItemCollapsibleState.None)]];
            });
        });
    };
    return ModelsProvider;
}());
function getNonce() {
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var text = '';
    for (var i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
var path = require("path");
var webviewHtml_1 = require("./webviewHtml");
var logic_1 = require("./logic");
function activate(context) {
    var _this = this;
    var containerId = 'madlab';
    var financeViewId = 'madlab.financePanel';
    var modelsViewId = 'madlab.models';
    var modelsProvider = new ModelsProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider(modelsViewId, modelsProvider));
    var currentView;
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(financeViewId, {
        resolveWebviewView: function (view) {
            currentView = view;
            var webview = view.webview;
            webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'media')),
                ],
            };
            var nonce = Date.now().toString(36);
            var scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'main.js')));
            var styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'styles.css')));
            webview.html = (0, webviewHtml_1.getWebviewContent)({ webview: webview, scriptUri: scriptUri, styleUri: styleUri, nonce: nonce });
            var init = {
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
            };
            webview.postMessage(init);
            webview.onDidReceiveMessage(function (msg) { return __awaiter(_this, void 0, void 0, function () {
                var result_1, message;
                return __generator(this, function (_a) {
                    if (!msg || typeof msg !== 'object')
                        return [2 /*return*/];
                    switch (msg.type) {
                        case 'CALC': {
                            try {
                                result_1 = (0, logic_1.handleCalc)(msg.payload);
                                webview.postMessage({ type: 'RESULT', payload: result_1 });
                            }
                            catch (err) {
                                message = err instanceof Error ? err.message : 'Unknown error';
                                webview.postMessage({ type: 'ERROR', error: message });
                            }
                            break;
                        }
                        case 'LOAD_MODEL': {
                            webview.postMessage({ type: 'LOAD_MODEL', payload: msg.payload });
                            break;
                        }
                    }
                    return [2 /*return*/];
                });
            }); });
        }
    }, { webviewOptions: { retainContextWhenHidden: true } }));
    context.subscriptions.push(vscode.commands.registerCommand('madlab.open', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, vscode.commands.executeCommand('workbench.view.extension.madlab')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, vscode.commands.executeCommand('workbench.views.service.openView', financeViewId, true)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }));
    context.subscriptions.push(vscode.commands.registerCommand('madlab.newModel', function () { return __awaiter(_this, void 0, void 0, function () {
        var ws, uri, template, doc;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ws = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
                    if (!ws) {
                        vscode.window.showErrorMessage('Open a workspace to create a model');
                        return [2 /*return*/];
                    }
                    uri = vscode.Uri.joinPath(ws.uri, 'example.mlab.json');
                    template = JSON.stringify({
                        fcf0: 120,
                        growth: 0.03,
                        wacc: 0.1,
                        horizon: 5,
                        terminalMultiple: 10,
                        shares: 100
                    }, null, 2);
                    return [4 /*yield*/, vscode.workspace.fs.writeFile(uri, Buffer.from(template))];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, vscode.workspace.openTextDocument(uri)];
                case 2:
                    doc = _b.sent();
                    return [4 /*yield*/, vscode.window.showTextDocument(doc)];
                case 3:
                    _b.sent();
                    if (currentView) {
                        currentView.webview.postMessage({ type: 'LOAD_MODEL', payload: JSON.parse(template) });
                    }
                    modelsProvider.refresh();
                    return [2 /*return*/];
            }
        });
    }); }));
    context.subscriptions.push(vscode.commands.registerCommand('madlab.loadModelInternal', function (uri) { return __awaiter(_this, void 0, void 0, function () {
        var buf, text, model, err_1, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, vscode.workspace.fs.readFile(uri)];
                case 1:
                    buf = _a.sent();
                    text = Buffer.from(buf).toString('utf8');
                    model = JSON.parse(text);
                    if (currentView) {
                        currentView.webview.postMessage({ type: 'LOAD_MODEL', payload: model });
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    message = err_1 instanceof Error ? err_1.message : 'Failed to load model';
                    vscode.window.showErrorMessage(message);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
