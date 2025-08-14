/**
 * Webview bridge script generator
 */

export function buildBridgeScript(nonce: string): string {
  return `
    <script nonce="${nonce}">
      (function(){
        const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
        let requestId = 0;
        const pending = new Map();

        const bridge = {
          post: (type, payload) => vscode && vscode.postMessage({ type, payload }),
          onMessage: (handler) => window.addEventListener('message', (e) => handler(e.data)),
          request: (type, payload) => {
            if (!vscode) return Promise.reject(new Error('VS Code API not available'));
            return new Promise((resolve, reject) => {
              const id = ++requestId;
              pending.set(id, { resolve, reject });
              vscode.postMessage({ type, payload: { ...payload, _requestId: id } });
              setTimeout(() => {
                if (pending.has(id)) {
                  pending.delete(id);
                  reject(new Error('Request timeout'));
                }
              }, 30000);
            });
          },
          // Common helpers
          getWorkspace: () => bridge.request('workspace:get', {}),
          syncWorkspace: (data) => {
            if (vscode) {
              vscode.postMessage({ type: 'workspace:sync', payload: { data } });
              return Promise.resolve(true);
            }
            return Promise.resolve(false);
          },
          saveFile: (path, content) => bridge.request('file:save', { path, content }),
          openFile: (path) => bridge.request('file:open', { path }),
          getTheme: () => bridge.request('theme:get', {}),
          showNotification: (message, type = 'info') => {
            if (vscode) {
              vscode.postMessage({ type: 'notification:show', payload: { message, type } });
            }
          },
          requestAgent: (message, history = []) => bridge.request('agent:request', { message, history }),
        };

        // Request/response correlation
        window.addEventListener('message', (event) => {
          const message = event.data;
          const payload = message?.payload;
          const id = payload?._requestId;
          if (id && pending.has(id)) {
            const { resolve } = pending.get(id);
            pending.delete(id);
            resolve(payload);
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


