import * as vscode from 'vscode';
import { EventEmitter } from 'events';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

interface MarketAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'crosses';
  value: number;
  triggered: boolean;
  message: string;
  timestamp: Date;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export class RealTimeDataManager extends EventEmitter {
  private context: vscode.ExtensionContext;
  private marketData: Map<string, MarketData> = new Map();
  private alerts: Map<string, MarketAlert> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private statusBarItem: vscode.StatusBarItem;
  private isConnected = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private updateQueue: Map<string, MarketData> = new Map();
  private batchUpdateTimeout: NodeJS.Timeout | null = null;
  private lastUpdateTime: Map<string, number> = new Map();
  private readonly UPDATE_THROTTLE_MS = 100; // Throttle updates to 10 FPS
  private readonly BATCH_DELAY_MS = 50; // Batch updates within 50ms

  constructor(context: vscode.ExtensionContext) {
    super();
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.setupStatusBar();
    this.loadConfiguration();
  }

  /**
   * Setup status bar item
   */
  private setupStatusBar(): void {
    this.statusBarItem.text = '$(radio-tower) Market Data';
    this.statusBarItem.tooltip = 'Click to view market data';
    this.statusBarItem.command = 'madlab.showMarketData';
    this.statusBarItem.show();
  }

  /**
   * Load configuration from VS Code settings
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('madlab');
    const enabled = config.get('realTimeData.enabled', true);
    const symbols = config.get('realTimeData.symbols', ['AAPL', 'GOOGL', 'MSFT']);
    const updateInterval = config.get('realTimeData.updateInterval', 5000);

    if (enabled) {
      this.startRealTimeData(symbols, updateInterval);
    }
  }

  /**
   * Start real-time data collection
   */
  async startRealTimeData(symbols: string[], updateInterval: number): Promise<void> {
    try {
      this.isConnected = true;
      this.updateStatusBar('Connected');
      this.emit('connected');

      // Start data collection for each symbol
      for (const symbol of symbols) {
        this.startSymbolDataCollection(symbol, updateInterval);
      }

      // Start alert monitoring
      this.startAlertMonitoring();

      // Start notification system
      this.startNotificationSystem();

    } catch (error) {
      this.handleError('Failed to start real-time data', error);
    }
  }

  /**
   * Start data collection for a specific symbol
   */
  private startSymbolDataCollection(symbol: string, updateInterval: number): void {
    const interval = setInterval(async () => {
      if (!this.isConnected) {
        clearInterval(interval);
        return;
      }

      try {
        const data = await this.fetchMarketData(symbol);
        if (data) {
          this.updateMarketData(symbol, data);
          this.checkAlerts(symbol, data);
        }
      } catch (error) {
        this.handleError(`Failed to fetch data for ${symbol}`, error);
      }
    }, updateInterval);

    // Store interval reference for cleanup
    this.context.subscriptions.push({
      dispose: () => clearInterval(interval)
    });
  }

  /**
   * Fetch market data for a symbol
   */
  private async fetchMarketData(symbol: string): Promise<MarketData | null> {
    try {
      // Mock market data - in real implementation, this would call actual APIs
      const mockData: MarketData = {
        symbol,
        price: 100 + Math.random() * 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date()
      };

      return mockData;
    } catch (error) {
      this.handleError(`Error fetching market data for ${symbol}`, error);
      return null;
    }
  }

  /**
   * Update market data for a symbol with throttling and batching
   */
  private updateMarketData(symbol: string, data: MarketData): void {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTime.get(symbol) || 0;
    
    // Throttle updates per symbol
    if (now - lastUpdate < this.UPDATE_THROTTLE_MS) {
      // Queue the update for batching
      this.updateQueue.set(symbol, data);
      this.scheduleBatchUpdate();
      return;
    }
    
    // Process immediate update
    this.processMarketDataUpdate(symbol, data);
  }

  /**
   * Process market data update immediately
   */
  private processMarketDataUpdate(symbol: string, data: MarketData): void {
    this.marketData.set(symbol, data);
    this.lastUpdateTime.set(symbol, Date.now());
    this.emit('marketDataUpdated', { symbol, data });
    
    // Update status bar with latest data (throttled)
    this.updateStatusBarWithData(symbol, data);
  }

  /**
   * Schedule batched updates
   */
  private scheduleBatchUpdate(): void {
    if (this.batchUpdateTimeout) {
      return; // Already scheduled
    }

    this.batchUpdateTimeout = setTimeout(() => {
      this.processBatchedUpdates();
      this.batchUpdateTimeout = null;
    }, this.BATCH_DELAY_MS);
  }

  /**
   * Process all queued updates in a batch
   */
  private processBatchedUpdates(): void {
    const updates: Array<{ symbol: string; data: MarketData }> = [];
    
    this.updateQueue.forEach((data, symbol) => {
      this.marketData.set(symbol, data);
      this.lastUpdateTime.set(symbol, Date.now());
      updates.push({ symbol, data });
    });
    
    this.updateQueue.clear();
    
    // Emit batch update event
    if (updates.length > 0) {
      this.emit('marketDataBatchUpdated', updates);
      
      // Update status bar with the most recent update
      const latestUpdate = updates[updates.length - 1];
      this.updateStatusBarWithData(latestUpdate.symbol, latestUpdate.data);
    }
  }

  /**
   * Update status bar with market data
   */
  private updateStatusBarWithData(symbol: string, data: MarketData): void {
    const changeIcon = data.change >= 0 ? '$(arrow-up)' : '$(arrow-down)';
    const changeColor = data.change >= 0 ? 'green' : 'red';
    
    this.statusBarItem.text = `${changeIcon} ${symbol}: $${data.price.toFixed(2)} (${data.changePercent.toFixed(2)}%)`;
    this.statusBarItem.color = changeColor;
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    const interval = setInterval(() => {
      if (!this.isConnected) {
        clearInterval(interval);
        return;
      }

      this.checkAllAlerts();
    }, 1000);

    this.context.subscriptions.push({
      dispose: () => clearInterval(interval)
    });
  }

  /**
   * Check alerts for a specific symbol
   */
  private checkAlerts(symbol: string, data: MarketData): void {
    const symbolAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.symbol === symbol && !alert.triggered);

    for (const alert of symbolAlerts) {
      let triggered = false;

      switch (alert.condition) {
        case 'above':
          triggered = data.price > alert.value;
          break;
        case 'below':
          triggered = data.price < alert.value;
          break;
        case 'crosses':
          // For crosses, we need to check if price crossed the threshold
          const previousData = this.marketData.get(symbol);
          if (previousData) {
            const wasAbove = previousData.price > alert.value;
            const isAbove = data.price > alert.value;
            triggered = wasAbove !== isAbove;
          }
          break;
      }

      if (triggered) {
        this.triggerAlert(alert, data);
      }
    }
  }

  /**
   * Check all alerts
   */
  private checkAllAlerts(): void {
    this.marketData.forEach((data, symbol) => {
      this.checkAlerts(symbol, data);
    });
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alert: MarketAlert, data: MarketData): void {
    alert.triggered = true;
    alert.timestamp = new Date();

    // Create notification
    const notification: Notification = {
      id: `alert_${alert.id}`,
      type: 'warning',
      title: `Market Alert: ${alert.symbol}`,
      message: `Price ${alert.condition} ${alert.value}: Current price $${data.price.toFixed(2)}`,
      timestamp: new Date(),
      read: false
    };

    this.notifications.set(notification.id, notification);

    // Show VS Code notification
    vscode.window.showWarningMessage(
      notification.message,
      'View Details',
      'Dismiss'
    ).then(selection => {
      if (selection === 'View Details') {
        this.showAlertDetails(alert);
      }
    });

    // Emit event
    this.emit('alertTriggered', { alert, data });
  }

  /**
   * Show alert details
   */
  private showAlertDetails(alert: MarketAlert): void {
    const panel = vscode.window.createWebviewPanel(
      'marketAlert',
      `Alert: ${alert.symbol}`,
      vscode.ViewColumn.One,
      {}
    );

    panel.webview.html = this.getAlertDetailsHtml(alert);
  }

  /**
   * Get HTML for alert details
   */
  private getAlertDetailsHtml(alert: MarketAlert): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Market Alert Details</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
            .alert-card { border: 1px solid #ccc; border-radius: 8px; padding: 20px; margin: 10px 0; }
            .alert-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .alert-details { margin: 10px 0; }
            .alert-timestamp { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="alert-card">
            <div class="alert-header">Market Alert: ${alert.symbol}</div>
            <div class="alert-details">
              <strong>Condition:</strong> ${alert.condition} ${alert.value}<br>
              <strong>Message:</strong> ${alert.message}<br>
              <strong>Status:</strong> ${alert.triggered ? 'Triggered' : 'Active'}<br>
              <strong>Current Price:</strong> $${this.marketData.get(alert.symbol)?.price.toFixed(2) || 'N/A'}
            </div>
            <div class="alert-timestamp">
              Created: ${alert.timestamp.toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Start notification system
   */
  private startNotificationSystem(): void {
    // Check for unread notifications every 30 seconds
    const interval = setInterval(() => {
      if (!this.isConnected) {
        clearInterval(interval);
        return;
      }

      this.checkUnreadNotifications();
    }, 30000);

    this.context.subscriptions.push({
      dispose: () => clearInterval(interval)
    });
  }

  /**
   * Check for unread notifications
   */
  private checkUnreadNotifications(): void {
    const unreadCount = Array.from(this.notifications.values())
      .filter(n => !n.read).length;

    if (unreadCount > 0) {
      this.updateStatusBar(`${unreadCount} unread notifications`);
    }
  }

  /**
   * Create a new market alert
   */
  async createAlert(symbol: string, condition: MarketAlert['condition'], value: number, message: string): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: MarketAlert = {
      id: alertId,
      symbol,
      condition,
      value,
      triggered: false,
      message,
      timestamp: new Date()
    };

    this.alerts.set(alertId, alert);
    this.emit('alertCreated', alert);

    // Save to workspace state
    await this.saveAlerts();

    return alertId;
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<boolean> {
    const deleted = this.alerts.delete(alertId);
    if (deleted) {
      await this.saveAlerts();
      this.emit('alertDeleted', alertId);
    }
    return deleted;
  }

  /**
   * Get all alerts
   */
  getAlerts(): MarketAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alerts for a specific symbol
   */
  getAlertsForSymbol(symbol: string): MarketAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.symbol === symbol);
  }

  /**
   * Get market data for a symbol
   */
  getMarketData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol);
  }

  /**
   * Get all market data
   */
  getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values());
  }

  /**
   * Get notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      this.emit('notificationRead', notificationId);
    }
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications.clear();
    this.emit('notificationsCleared');
  }

  /**
   * Save alerts to workspace state
   */
  private async saveAlerts(): Promise<void> {
    try {
      const alertsArray = Array.from(this.alerts.values());
      await this.context.workspaceState.update('marketAlerts', alertsArray);
    } catch (error) {
      this.handleError('Failed to save alerts', error);
    }
  }

  /**
   * Load alerts from workspace state
   */
  private async loadAlerts(): Promise<void> {
    try {
      const savedAlerts = this.context.workspaceState.get('marketAlerts', []) as MarketAlert[];
      for (const alert of savedAlerts) {
        this.alerts.set(alert.id, alert);
      }
    } catch (error) {
      this.handleError('Failed to load alerts', error);
    }
  }

  /**
   * Update status bar
   */
  private updateStatusBar(text: string): void {
    this.statusBarItem.text = `$(radio-tower) ${text}`;
  }

  /**
   * Handle errors
   */
  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.emit('error', { message, error });
    
    // Show error notification
    vscode.window.showErrorMessage(message);
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.updateStatusBar('Disconnected');
    this.emit('disconnected');

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.batchUpdateTimeout) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = null;
    }

    // Process any remaining queued updates before disconnecting
    if (this.updateQueue.size > 0) {
      this.processBatchedUpdates();
    }

    // Save current state
    await this.saveAlerts();
  }

  /**
   * Get connection status
   */
  isDataConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    symbols: number;
    alerts: number;
    notifications: number;
    connected: boolean;
  } {
    return {
      symbols: this.marketData.size,
      alerts: this.alerts.size,
      notifications: this.notifications.size,
      connected: this.isConnected
    };
  }
}
