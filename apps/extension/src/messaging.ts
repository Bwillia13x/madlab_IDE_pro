export type FromWebviewMessage =
  | { type: 'webview:ready'; payload: { version: number } }
  | { type: 'ping'; payload?: unknown };

export type ToWebviewMessage =
  | { type: 'extension:ready'; payload: { version: number } }
  | { type: 'pong'; payload?: unknown };
