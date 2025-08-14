import * as vscode from 'vscode';
import * as path from 'path';
import type { RouteHandler } from './types';

export const fileRoutes: Record<string, RouteHandler> = {
  'file:save': async (msg, panel, _context, workspaceRoot) => {
    try {
      const { path: filePath, content } = msg.payload;
      let fullPath: vscode.Uri;
      if (path.isAbsolute(filePath)) fullPath = vscode.Uri.file(filePath);
      else if (workspaceRoot) fullPath = vscode.Uri.joinPath(workspaceRoot, filePath);
      else throw new Error('No workspace open to resolve relative path');

      await vscode.workspace.fs.writeFile(fullPath, new TextEncoder().encode(content));
      panel.webview.postMessage({ type: 'file:saved', payload: { success: true, path: filePath } });
    } catch (error) {
      panel.webview.postMessage({ type: 'file:saved', payload: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } });
    }
  },
  'file:open': async (msg, panel, _context, workspaceRoot) => {
    const { path: filePath } = msg.payload;
    try {
      let fullPath: vscode.Uri;
      if (path.isAbsolute(filePath)) fullPath = vscode.Uri.file(filePath);
      else if (workspaceRoot) fullPath = vscode.Uri.joinPath(workspaceRoot, filePath);
      else throw new Error('No workspace open to resolve relative path');
      const fileData = await vscode.workspace.fs.readFile(fullPath);
      const content = new TextDecoder().decode(fileData);
      panel.webview.postMessage({ type: 'file:opened', payload: { success: true, content } });
    } catch (error) {
      panel.webview.postMessage({ type: 'file:opened', payload: { success: false, error: error instanceof Error ? error.message : 'File not found' } });
    }
  },
};


