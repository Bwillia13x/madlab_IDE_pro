export type FromWebviewMessage =
  | { type: 'webview:ready'; payload: { version: number } }
  | { type: 'ping'; payload?: unknown }
  | { type: 'workspace:get'; payload: {} }
  | { type: 'workspace:sync'; payload: { data: any } }
  | { type: 'file:save'; payload: { path: string; content: string } }
  | { type: 'file:open'; payload: { path: string } }
  | { type: 'theme:get'; payload: {} }
  | { type: 'notification:show'; payload: { message: string; type?: 'info' | 'warning' | 'error' } }
  | { type: 'agent:request'; payload: { message: string; history: any[] } };

export type ToWebviewMessage =
  | { type: 'extension:ready'; payload: { version: number; extensionId: string } }
  | { type: 'pong'; payload?: unknown }
  | { type: 'workspace:data'; payload: { data: any } }
  | { type: 'file:saved'; payload: { success: boolean; path?: string; error?: string } }
  | { type: 'file:opened'; payload: { success: boolean; content?: string; error?: string } }
  | { type: 'theme:data'; payload: { theme: 'dark' | 'light' | 'high-contrast' } }
  | { type: 'agent:response'; payload: { response: string; error?: string } };

export interface WebviewBridge {
  post(type: string, payload?: any): void;
  onMessage(handler: (message: ToWebviewMessage) => void): void;
  getWorkspace(): Promise<any>;
  syncWorkspace(data: any): Promise<boolean>;
  saveFile(path: string, content: string): Promise<boolean>;
  openFile(path: string): Promise<string | null>;
  getTheme(): Promise<'dark' | 'light' | 'high-contrast'>;
  showNotification(message: string, type?: 'info' | 'warning' | 'error'): void;
  requestAgent(message: string, history: any[]): Promise<string>;
}
