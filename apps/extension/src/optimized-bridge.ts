import * as vscode from 'vscode';

// Optimized message bridge for VS Code extension
export interface BridgeMessage {
  id: string;
  type: string;
  payload?: any;
  timestamp: number;
}

export interface BridgeResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export class OptimizedExtensionBridge {
  private messageHandlers = new Map<string, (payload: any) => Promise<any>>();
  private pendingRequests = new Map<
    string,
    { resolve: (value: any) => void; reject: (error: any) => void }
  >();
  private messageQueue: BridgeMessage[] = [];
  private isProcessing = false;
  private webview: vscode.Webview | null = null;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.setupMessageHandlers();
  }

  // Set the webview instance for communication
  setWebview(webview: vscode.Webview) {
    this.webview = webview;
    this.processMessageQueue();
  }

  // Register message handlers
  private setupMessageHandlers() {
    // Theme management
    this.messageHandlers.set('theme:get', async () => {
      const theme = vscode.window.activeColorTheme.kind;
      return { theme: this.mapVSCodeTheme(theme) };
    });

    // API key management
    this.messageHandlers.set('apiKey:get', async (payload: { key: string }) => {
      try {
        const value = await this.context.secrets.get(payload.key);
        return { value };
      } catch (error) {
        throw new Error(`Failed to retrieve API key: ${error}`);
      }
    });

    this.messageHandlers.set('apiKey:set', async (payload: { key: string; value: string }) => {
      try {
        await this.context.secrets.store(payload.key, payload.value);
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to store API key: ${error}`);
      }
    });

    // Workspace data management
    this.messageHandlers.set('workspace:save', async (payload: { data: any }) => {
      try {
        const workspaceData = JSON.stringify(payload.data);
        const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;

        if (workspaceUri) {
          const fileUri = vscode.Uri.joinPath(workspaceUri, '.madlab-workspace.json');
          const encoder = new TextEncoder();
          await vscode.workspace.fs.writeFile(fileUri, encoder.encode(workspaceData));
          return { success: true, path: fileUri.fsPath };
        } else {
          throw new Error('No workspace folder found');
        }
      } catch (error) {
        throw new Error(`Failed to save workspace: ${error}`);
      }
    });

    this.messageHandlers.set('workspace:load', async () => {
      try {
        const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;

        if (workspaceUri) {
          const fileUri = vscode.Uri.joinPath(workspaceUri, '.madlab-workspace.json');
          const fileData = await vscode.workspace.fs.readFile(fileUri);
          const workspaceData = JSON.parse(fileData.toString());
          return { data: workspaceData };
        } else {
          throw new Error('No workspace folder found');
        }
      } catch (error) {
        // Return empty workspace if file doesn't exist
        return { data: { sheets: [], activeSheetId: null } };
      }
    });

    // File system operations
    this.messageHandlers.set('fs:read', async (payload: { path: string }) => {
      try {
        const uri = vscode.Uri.file(payload.path);
        const data = await vscode.workspace.fs.readFile(uri);
        return { data: data.toString() };
      } catch (error) {
        throw new Error(`Failed to read file: ${error}`);
      }
    });

    this.messageHandlers.set('fs:write', async (payload: { path: string; data: string }) => {
      try {
        const uri = vscode.Uri.file(payload.path);
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(payload.data));
        return { success: true };
      } catch (error) {
        throw new Error(`Failed to write file: ${error}`);
      }
    });

    // Performance monitoring
    this.messageHandlers.set('performance:metrics', async () => {
      const memory = process.memoryUsage();
      return {
        memory: {
          rss: memory.rss,
          heapUsed: memory.heapUsed,
          heapTotal: memory.heapTotal,
          external: memory.external,
        },
        uptime: process.uptime(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      };
    });

    // Extension health check
    this.messageHandlers.set('health:check', async () => {
      return {
        status: 'healthy',
        version: this.context.extension.packageJSON.version,
        timestamp: Date.now(),
      };
    });
  }

  // Handle incoming messages from webview
  async handleMessage(message: BridgeMessage): Promise<void> {
    try {
      const handler = this.messageHandlers.get(message.type);

      if (handler) {
        const result = await handler(message.payload);
        this.sendResponse(message.id, true, result);
      } else {
        this.sendResponse(message.id, false, undefined, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.sendResponse(
        message.id,
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // Send response back to webview
  private sendResponse(id: string, success: boolean, data?: any, error?: string): void {
    if (!this.webview) {
      // Queue message if webview not ready
      this.messageQueue.push({
        id,
        type: 'response',
        payload: { success, data, error },
        timestamp: Date.now(),
      });
      return;
    }

    const response: BridgeResponse = {
      id,
      success,
      data,
      error,
      timestamp: Date.now(),
    };

    this.webview.postMessage(response);
  }

  // Process queued messages
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || !this.webview) return;

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.handleMessage(message);
      }
    }

    this.isProcessing = false;
  }

  // Send message to webview
  sendMessage(type: string, payload?: any): void {
    if (!this.webview) return;

    const message: BridgeMessage = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
    };

    this.webview.postMessage(message);
  }

  // Generate unique message ID
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Map VS Code theme to webview theme
  private mapVSCodeTheme(vscodeTheme: vscode.ColorThemeKind): string {
    switch (vscodeTheme) {
      case vscode.ColorThemeKind.Light:
        return 'light';
      case vscode.ColorThemeKind.Dark:
        return 'dark';
      case vscode.ColorThemeKind.HighContrast:
        return 'high-contrast';
      default:
        return 'dark';
    }
  }

  // Cleanup resources
  dispose(): void {
    this.messageHandlers.clear();
    this.pendingRequests.clear();
    this.messageQueue = [];
    this.webview = null;
  }
}

// Webview security utilities
export class WebviewSecurity {
  private static readonly ALLOWED_ORIGINS = ['https://localhost:3000', 'https://localhost:3001'];
  private static readonly ALLOWED_PROTOCOLS = ['https:', 'http:'];
  private static readonly BLOCKED_DOMAINS = ['malicious.com', 'phishing.com'];

  // Validate webview origin
  static validateOrigin(origin: string): boolean {
    try {
      const url = new URL(origin);

      // Check protocol
      if (!this.ALLOWED_PROTOCOLS.includes(url.protocol)) {
        return false;
      }

      // Check domain
      if (this.BLOCKED_DOMAINS.includes(url.hostname)) {
        return false;
      }

      // Allow localhost for development
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return true;
      }

      // Check against allowed origins
      return this.ALLOWED_ORIGINS.includes(origin);
    } catch {
      return false;
    }
  }

  // Generate secure CSP headers
  static generateCSP(): string {
    return [
      "default-src 'none'",
      "script-src 'unsafe-inline' 'unsafe-eval'",
      "style-src 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; ');
  }

  // Sanitize HTML content
  static sanitizeHTML(html: string): string {
    // Remove potentially dangerous tags and attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  startTimer(name: string): void {
    this.startTimes.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.startTimes.get(name);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.startTimes.delete(name);

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    return duration;
  }

  getMetrics(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const result: Record<string, { count: number; avg: number; min: number; max: number }> = {};

    for (const [name, values] of this.metrics.entries()) {
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const min = Math.min(...values);
      const max = Math.max(...values);

      result[name] = { count, avg, min, max };
    }

    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}
