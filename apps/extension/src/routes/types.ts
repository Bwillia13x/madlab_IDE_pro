import * as vscode from 'vscode';

export type RouteHandler = (
  msg: any,
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  workspaceRoot?: vscode.Uri
) => Promise<void>;


