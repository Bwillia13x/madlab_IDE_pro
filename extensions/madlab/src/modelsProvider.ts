import * as vscode from 'vscode';

export class ModelsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return [];
    const files = await vscode.workspace.findFiles('**/*.mlab.json');
    return files.map((uri) => {
      const item = new vscode.TreeItem(uri.path.split('/').pop() ?? uri.toString(), vscode.TreeItemCollapsibleState.None);
      item.command = {
        title: 'Load Model',
        command: 'madlab.loadModelInternal',
        arguments: [uri]
      };
      item.tooltip = uri.fsPath;
      return item;
    });
  }
}


