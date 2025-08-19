import type { Widget, WorkspaceState as StoreWorkspaceState } from '../store';
import type { Layout } from 'react-grid-layout';

export interface WorkspaceChange {
  id: string;
  type: 'widget_add' | 'widget_remove' | 'widget_move' | 'widget_resize' | 'widget_config' | 'layout_change';
  userId: string;
  timestamp: Date;
  data: any;
  metadata?: {
    sessionId: string;
    deviceInfo?: string;
    userAgent?: string;
  };
}

export interface WorkspaceState {
  id: string;
  name: string;
  layout: Layout[];
  widgets: Map<string, Widget>;
  lastModified: Date;
  version: number;
  collaborators: Set<string>;
}

export interface CollaborationUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  sessionId: string;
  lastActive: Date;
  cursor?: {
    x: number;
    y: number;
    widgetId?: string;
  };
}

export interface SyncMessage {
  type: 'state_update' | 'user_join' | 'user_leave' | 'cursor_update' | 'chat_message' | 'error' | 'heartbeat';
  payload: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export class WorkspaceSyncService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private state: WorkspaceState | null = null;
  private users = new Map<string, CollaborationUser>();
  private eventHandlers = new Map<string, (...args: any[]) => void>();
  private pendingChanges: WorkspaceChange[] = [];
  private isConnected = false;
  private workspaceId: string | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;

  constructor(
    private serverUrl: string,
    private apiKey?: string
  ) {
    this.generateSessionId();
  }

  private generateSessionId(): void {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect(workspaceId: string, userId: string): Promise<void> {
    this.workspaceId = workspaceId;
    this.userId = userId;

    try {
      await this.establishConnection();
      this.isConnected = true;
      this.startHeartbeat();
      this.flushPendingChanges();
      
      // Notify that we've joined
      this.sendMessage({
        type: 'user_join',
        payload: {
          userId,
          workspaceId,
          sessionId: this.sessionId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to connect to workspace sync service:', error);
      this.scheduleReconnect();
    }
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/workspace/${this.workspaceId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Connected to workspace sync service');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse sync message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from workspace sync service');
        this.isConnected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      // Set connection timeout
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => {
        if (!this.isConnected) {
          this.connect(this.workspaceId!, this.userId!);
        }
      }, delay);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'heartbeat',
          payload: { timestamp: new Date() },
        });
      }
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'state_update':
        this.handleStateUpdate(message.payload);
        break;
      case 'user_join':
        this.handleUserJoin(message.payload);
        break;
      case 'user_leave':
        this.handleUserLeave(message.payload);
        break;
      case 'cursor_update':
        this.handleCursorUpdate(message.payload);
        break;
      case 'chat_message':
        this.handleChatMessage(message.payload);
        break;
      case 'error':
        console.error('Sync service error:', message.payload);
        break;
    }

    // Notify event handlers
    const handler = this.eventHandlers.get(message.type);
    if (handler) {
      handler(message.payload);
    }
  }

  private handleStateUpdate(payload: any): void {
    if (payload.workspaceId === this.workspaceId) {
      this.state = payload.state;
      this.notifyStateChange();
    }
  }

  private handleUserJoin(payload: any): void {
    if (payload.workspaceId === this.workspaceId) {
      this.users.set(payload.user.id, payload.user);
      this.notifyUserChange();
    }
  }

  private handleUserLeave(payload: any): void {
    if (payload.workspaceId === this.workspaceId) {
      this.users.delete(payload.userId);
      this.notifyUserChange();
    }
  }

  private handleCursorUpdate(payload: any): void {
    if (payload.workspaceId === this.workspaceId && payload.userId !== this.userId) {
      const user = this.users.get(payload.userId);
      if (user) {
        user.cursor = payload.cursor;
        this.notifyCursorChange(payload.userId, payload.cursor);
      }
    }
  }

  private handleChatMessage(payload: any): void {
    if (payload.workspaceId === this.workspaceId) {
      this.notifyChatMessage(payload);
    }
  }

  private sendMessage(message: Partial<SyncMessage>): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      const fullMessage: SyncMessage = {
        type: message.type || 'state_update',
        payload: message.payload || {},
        timestamp: new Date(),
        userId: this.userId || undefined,
        sessionId: this.sessionId || undefined,
      };

      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // Queue message for later if not connected
      this.pendingChanges.push({
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'widget_config',
        userId: this.userId || 'unknown',
        timestamp: new Date(),
        data: message,
      });
    }
  }

  private flushPendingChanges(): void {
    if (this.isConnected && this.pendingChanges.length > 0) {
      this.pendingChanges.forEach(change => {
        this.sendChange(change);
      });
      this.pendingChanges = [];
    }
  }

  // Public methods for workspace synchronization
  sendChange(change: WorkspaceChange): void {
    if (this.isConnected) {
      this.sendMessage({
        type: 'state_update',
        payload: {
          workspaceId: this.workspaceId,
          change,
          timestamp: new Date(),
        },
      });
    } else {
      this.pendingChanges.push(change);
    }
  }

  updateWidgetPosition(widgetId: string, x: number, y: number): void {
    const change: WorkspaceChange = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'widget_move',
      userId: this.userId || 'unknown',
      timestamp: new Date(),
      data: { widgetId, x, y },
    };

    this.sendChange(change);
  }

  updateWidgetSize(widgetId: string, width: number, height: number): void {
    const change: WorkspaceChange = {
      id: `size_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'widget_resize',
      userId: this.userId || 'unknown',
      timestamp: new Date(),
      data: { widgetId, width, height },
    };

    this.sendChange(change);
  }

  updateWidgetConfig(widgetId: string, config: Partial<Widget>): void {
    const change: WorkspaceChange = {
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'widget_config',
      userId: this.userId || 'unknown',
      timestamp: new Date(),
      data: { widgetId, config },
    };

    this.sendChange(change);
  }

  addWidget(widget: Widget): void {
    const change: WorkspaceChange = {
      id: `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'widget_add',
      userId: this.userId || 'unknown',
      timestamp: new Date(),
      data: { widget },
    };

    this.sendChange(change);
  }

  removeWidget(widgetId: string): void {
    const change: WorkspaceChange = {
      id: `remove_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'widget_remove',
      userId: this.userId || 'unknown',
      timestamp: new Date(),
      data: { widgetId },
    };

    this.sendChange(change);
  }

  updateLayout(layout: Layout[]): void {
    const change: WorkspaceChange = {
      id: `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'layout_change',
      userId: this.userId || 'unknown',
      timestamp: new Date(),
      data: { layout },
    };

    this.sendChange(change);
  }

  updateCursor(x: number, y: number, widgetId?: string): void {
    this.sendMessage({
      type: 'cursor_update',
      payload: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        cursor: { x, y, widgetId },
        timestamp: new Date(),
      },
    });
  }

  sendChatMessage(message: string): void {
    this.sendMessage({
      type: 'chat_message',
      payload: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        message,
        timestamp: new Date(),
      },
    });
  }

  // Event handling
  onStateChange(handler: (state: WorkspaceState) => void): void {
    this.eventHandlers.set('state_update', handler);
  }

  onUserChange(handler: (users: Map<string, CollaborationUser>) => void): void {
    this.eventHandlers.set('user_join', handler);
    this.eventHandlers.set('user_leave', handler);
  }

  onCursorChange(handler: (userId: string, cursor: any) => void): void {
    this.eventHandlers.set('cursor_update', handler);
  }

  onChatMessage(handler: (message: any) => void): void {
    this.eventHandlers.set('chat_message', handler);
  }

  // Notification methods
  private notifyStateChange(): void {
    const handler = this.eventHandlers.get('state_update');
    if (handler && this.state) {
      handler(this.state);
    }
  }

  private notifyUserChange(): void {
    const handler = this.eventHandlers.get('user_join');
    if (handler) {
      handler(this.users);
    }
  }

  private notifyCursorChange(userId: string, cursor: any): void {
    const handler = this.eventHandlers.get('cursor_update');
    if (handler) {
      handler(userId, cursor);
    }
  }

  private notifyChatMessage(message: any): void {
    const handler = this.eventHandlers.get('chat_message');
    if (handler) {
      handler(message);
    }
  }

  // Utility methods
  getCurrentState(): WorkspaceState | null {
    return this.state;
  }

  getCollaborators(): CollaborationUser[] {
    return Array.from(this.users.values());
  }

  isUserCollaborator(userId: string): boolean {
    return this.users.has(userId);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Cleanup
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stopHeartbeat();
    this.isConnected = false;
    this.state = null;
    this.users.clear();
    this.eventHandlers.clear();
    this.pendingChanges = [];
  }
}

// Export singleton instance
export const workspaceSync = new WorkspaceSyncService(
  process.env.WORKSPACE_SYNC_URL || 'ws://localhost:3001',
  process.env.WORKSPACE_SYNC_API_KEY
);
