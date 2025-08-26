'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/store';

interface UserPresence {
  userId: string;
  name: string;
  avatar?: string;
  color: string;
  lastSeen: Date;
  isOnline: boolean;
  currentSheet?: string;
  currentWidget?: string;
  cursor?: {
    x: number;
    y: number;
    sheetId: string;
  };
}

interface CollaborationState {
  users: Map<string, UserPresence>;
  currentUser: UserPresence | null;
  isConnected: boolean;
  pendingChanges: Array<{
    id: string;
    type: 'widget' | 'layout' | 'sheet';
    data: unknown;
    timestamp: Date;
  }>;
}

interface CollaborationContextType extends CollaborationState {
  updatePresence: (presence: Partial<UserPresence>) => void;
  broadcastChange: (change: { type: string; data: unknown }) => void;
  getUsersInSheet: (sheetId: string) => UserPresence[];
  getUsersViewingWidget: (widgetId: string) => UserPresence[];
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

interface CollaborationProviderProps {
  children: React.ReactNode;
  roomId?: string;
  userId?: string;
  userName?: string;
}

// Mock WebSocket for demonstration - replace with real implementation
class MockCollaborationSocket {
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private isConnected = false;

  connect() {
    this.isConnected = true;
    setTimeout(() => {
      this.emit('connected', { userId: 'demo-user' });
    }, 1000);
  }

  disconnect() {
    this.isConnected = false;
    this.emit('disconnected', {});
  }

  emit(event: string, data: unknown) {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach(listener => listener(data));
  }

  on(event: string, listener: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (data: unknown) => void) {
    const eventListeners = this.listeners.get(event) || [];
    const index = eventListeners.indexOf(listener);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  send(event: string, data: unknown) {
    // Simulate network delay
    setTimeout(() => {
      this.emit(`response:${event}`, data);
    }, 100);
  }
}

export function CollaborationProvider({
  children,
  roomId = 'default-room',
  userId = 'user-' + Math.random().toString(36).substr(2, 9),
  userName = 'Anonymous User'
}: CollaborationProviderProps) {
  const [state, setState] = useState<CollaborationState>({
    users: new Map(),
    currentUser: null,
    isConnected: false,
    pendingChanges: []
  });

  const socketRef = useRef<MockCollaborationSocket | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout>();
  const { activeSheetId } = useWorkspaceStore();

  // Initialize current user
  useEffect(() => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    setState(prev => ({
      ...prev,
      currentUser: {
        userId,
        name: userName,
        color: randomColor,
        lastSeen: new Date(),
        isOnline: true,
        currentSheet: activeSheetId
      }
    }));
  }, [userId, userName, activeSheetId]);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = new MockCollaborationSocket();
    socketRef.current.connect();

    const socket = socketRef.current;

    // Handle connection events
    socket.on('connected', (data: unknown) => {
      setState(prev => ({ ...prev, isConnected: true }));

      // Send initial presence
      if (state.currentUser) {
        socket.send('presence', {
          userId: state.currentUser.userId,
          name: state.currentUser.name,
          color: state.currentUser.color,
          roomId
        });
      }
    });

    socket.on('disconnected', () => {
      setState(prev => ({ ...prev, isConnected: false }));
    });

    // Handle presence updates
    socket.on('presence', (data: unknown) => {
      const presence = data as UserPresence;
      setState(prev => ({
        ...prev,
        users: new Map(prev.users).set(presence.userId, {
          ...presence,
          lastSeen: new Date(),
          isOnline: true
        })
      }));
    });

    // Handle user left
    socket.on('user-left', (data: unknown) => {
      const { userId } = data as { userId: string };
      setState(prev => {
        const newUsers = new Map(prev.users);
        const user = newUsers.get(userId);
        if (user) {
          newUsers.set(userId, { ...user, isOnline: false, lastSeen: new Date() });
        }
        return { ...prev, users: newUsers };
      });
    });

    // Handle collaborative changes
    socket.on('change', (data: unknown) => {
      const change = data as { userId: string; type: string; data: unknown; timestamp: Date };
      // Handle incoming changes from other users
      console.log('Received change:', change);
    });

    return () => {
      socket.disconnect();
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [roomId, state.currentUser]);

  // Send periodic presence updates
  useEffect(() => {
    if (!state.isConnected || !state.currentUser) return;

    presenceIntervalRef.current = setInterval(() => {
      socketRef.current?.send('presence', {
        userId: state.currentUser!.userId,
        name: state.currentUser!.name,
        color: state.currentUser!.color,
        currentSheet: activeSheetId,
        lastSeen: new Date()
      });
    }, 30000); // Update every 30 seconds

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [state.isConnected, state.currentUser, activeSheetId]);

  // Update presence
  const updatePresence = useCallback((presence: Partial<UserPresence>) => {
    setState(prev => {
      if (!prev.currentUser) return prev;

      const updatedUser = { ...prev.currentUser, ...presence, lastSeen: new Date() };
      setState(current => ({ ...current, currentUser: updatedUser }));

      // Broadcast presence update
      socketRef.current?.send('presence', {
        userId: updatedUser.userId,
        name: updatedUser.name,
        color: updatedUser.color,
        currentSheet: updatedUser.currentSheet,
        currentWidget: updatedUser.currentWidget,
        cursor: updatedUser.cursor,
        lastSeen: updatedUser.lastSeen
      });

      return { ...prev, currentUser: updatedUser };
    });
  }, []);

  // Broadcast changes
  const broadcastChange = useCallback((change: { type: string; data: unknown }) => {
    if (!state.currentUser || !socketRef.current) return;

    socketRef.current.send('change', {
      userId: state.currentUser.userId,
      type: change.type,
      data: change.data,
      timestamp: new Date()
    });
  }, [state.currentUser]);

  // Get users in a specific sheet
  const getUsersInSheet = useCallback((sheetId: string): UserPresence[] => {
    return Array.from(state.users.values()).filter(user =>
      user.isOnline && user.currentSheet === sheetId
    );
  }, [state.users]);

  // Get users viewing a specific widget
  const getUsersViewingWidget = useCallback((widgetId: string): UserPresence[] => {
    return Array.from(state.users.values()).filter(user =>
      user.isOnline && user.currentWidget === widgetId
    );
  }, [state.users]);

  const contextValue: CollaborationContextType = {
    ...state,
    updatePresence,
    broadcastChange,
    getUsersInSheet,
    getUsersViewingWidget
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}

// Real-time presence indicator component
interface PresenceIndicatorProps {
  user: UserPresence;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function PresenceIndicator({
  user,
  size = 'md',
  showName = true,
  className = ''
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const statusClasses = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500'
  };

  const status = user.isOnline ? 'online' : 'offline';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full ${statusClasses[status]} ring-2 ring-white`}
          title={`${user.name} is ${status}`}
        />
        {user.cursor && (
          <div
            className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
            title={`${user.name} is active`}
          />
        )}
      </div>
      {showName && (
        <span
          className="text-sm font-medium"
          style={{ color: user.color }}
        >
          {user.name}
        </span>
      )}
    </div>
  );
}

// Multiple users presence component
interface MultiUserPresenceProps {
  users: UserPresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MultiUserPresence({
  users,
  maxVisible = 3,
  size = 'md',
  className = ''
}: MultiUserPresenceProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = Math.max(0, users.length - maxVisible);

  return (
    <div className={`flex items-center -space-x-1 ${className}`}>
      {visibleUsers.map((user) => (
        <div
          key={user.userId}
          className="relative"
          title={user.name}
        >
          <div
            className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full ring-2 ring-white`}
            style={{ backgroundColor: user.color }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-1 ring-white ${
            user.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-gray-300 ring-2 ring-white flex items-center justify-center`}>
          <span className="text-xs text-gray-600">+{remainingCount}</span>
        </div>
      )}
    </div>
  );
}

// Collaboration status bar component
export function CollaborationStatusBar() {
  const { users, isConnected } = useCollaboration();
  const onlineUsers = Array.from(users.values()).filter(user => user.isOnline);

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 border-t">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {onlineUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Online:</span>
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 5).map((user) => (
              <div
                key={user.userId}
                className="w-6 h-6 rounded-full ring-1 ring-white"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {onlineUsers.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-gray-300 ring-1 ring-white flex items-center justify-center">
                <span className="text-xs text-gray-600">+{onlineUsers.length - 5}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

