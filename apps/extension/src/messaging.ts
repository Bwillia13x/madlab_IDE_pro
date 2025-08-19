export type FromWebviewMessage =
  | { type: 'webview:ready'; payload: { version: number } }
  | { type: 'ping'; payload?: unknown }
  | { type: 'workspace:get'; payload: {} }
  | { type: 'workspace:sync'; payload: { data: any } }
  | { type: 'file:save'; payload: { path: string; content: string } }
  | { type: 'file:open'; payload: { path: string } }
  | { type: 'theme:get'; payload: {} }
  | { type: 'notification:show'; payload: { message: string; type?: 'info' | 'warning' | 'error' } }
  | { type: 'agent:request'; payload: { message: string; history: any[] } }
  // Data requests (Batch 04)
  | { type: 'data:quote'; payload: { symbol: string } & { _requestId?: number } }
  | {
      type: 'data:prices';
      payload: {
        symbol: string;
        range?: '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'MAX';
      } & { _requestId?: number };
    }
  | { type: 'data:kpis'; payload: { symbol: string } & { _requestId?: number } }
  | { type: 'data:financials'; payload: { symbol: string } & { _requestId?: number } }
  | { type: 'data:vol'; payload: { symbol: string } & { _requestId?: number } }
  // Settings sync (Phase 2)
  | { type: 'settings:get'; payload: {} }
  | { type: 'settings:update'; payload: { key: string; value: any } }
  | { type: 'settings:sync'; payload: { settings: Record<string, any> } }
  | { type: 'backtest:run'; payload: { strategy: string; params: any } };

export type ToWebviewMessage =
  | { type: 'extension:ready'; payload: { version: number; extensionId: string } }
  | { type: 'pong'; payload?: unknown }
  | { type: 'workspace:data'; payload: { data: any } }
  | { type: 'file:saved'; payload: { success: boolean; path?: string; error?: string } }
  | { type: 'file:opened'; payload: { success: boolean; content?: string; error?: string } }
  | { type: 'theme:data'; payload: { theme: 'dark' | 'light' | 'high-contrast' } }
  | { type: 'agent:response'; payload: { response: string; error?: string } }
  // Settings sync responses (Phase 2)
  | { type: 'settings:data'; payload: { settings: Record<string, any> } }
  | { type: 'settings:updated'; payload: { success: boolean; key: string; error?: string } }
  | { type: 'backtest:result'; payload: { success: boolean; result?: any; error?: string } };

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
  // Settings sync methods (Phase 2)
  getSettings(): Promise<Record<string, any>>;
  updateSetting(key: string, value: any): Promise<boolean>;
  syncSettings(settings: Record<string, any>): Promise<boolean>;
  runBacktest(strategy: string, params: any): Promise<any>;
}
