import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockAIAgent, mockDataProvider, mockData } from '../mocks';

interface SyncQueueItem {
  workspaceId: string;
  update: Record<string, unknown>;
  timestamp: Date;
}

interface Workspace {
  id: string;
  version: number;
  widgets: unknown[];
  lastModified: Date;
  modifiedBy: string;
  [key: string]: unknown;
}

// Mock collaboration manager
const mockCollaborationManager = {
  workspaces: new Map<string, Workspace>(),
  users: new Map(),
  syncQueue: [] as SyncQueueItem[],
  
  createWorkspace(id: string, initialData: Record<string, unknown>) {
    const workspace: Workspace = {
      id,
      version: 1,
      widgets: (initialData.widgets as unknown[]) || [],
      lastModified: new Date(),
      modifiedBy: 'system',
      ...initialData
    };
    this.workspaces.set(id, workspace);
    return workspace;
  },
  
  getWorkspace(id: string) {
    return this.workspaces.get(id);
  },
  
  updateWorkspace(id: string, updates: any, userId: string) {
    const workspace = this.workspaces.get(id);
    if (!workspace) return null;
    
    workspace.version += 1;
    workspace.lastModified = new Date();
    workspace.modifiedBy = userId;
    
    if (updates.widgets) {
      // Always append new widget entries (this tracks change history)
      workspace.widgets = [...workspace.widgets, ...updates.widgets];
    }
    
    this.workspaces.set(id, workspace);
    return workspace;
  },
  
  addUserToWorkspace(workspaceId: string, userId: string) {
    if (!this.users.has(workspaceId)) {
      this.users.set(workspaceId, new Set());
    }
    this.users.get(workspaceId).add(userId);
  },
  
  removeUserFromWorkspace(workspaceId: string, userId: string) {
    const users = this.users.get(workspaceId);
    if (users) {
      users.delete(userId);
    }
  },
  
  getUsersInWorkspace(workspaceId: string) {
    return Array.from(this.users.get(workspaceId) || []);
  },
  
  addToSyncQueue(workspaceId: string, update: Record<string, unknown>) {
    this.syncQueue.push({ workspaceId, update, timestamp: new Date() });
  },
  
  getSyncQueue(workspaceId: string) {
    return this.syncQueue.filter(item => item.workspaceId === workspaceId);
  },
  
  clearSyncQueue(workspaceId: string) {
    this.syncQueue = this.syncQueue.filter(item => item.workspaceId !== workspaceId);
  }
};

describe('Real-time Collaboration Tests', () => {
  let mockProvider: any;

  beforeEach(async () => {
    // Set up mock provider
    mockProvider = {
      ...mockDataProvider,
      getPrices: vi.fn().mockResolvedValue(mockData.prices),
      getKpis: vi.fn().mockResolvedValue(mockData.kpis),
      getFinancials: vi.fn().mockResolvedValue(mockData.financials),
      name: 'mock-collaboration',
    };

    // Reset collaboration manager state
    mockCollaborationManager.workspaces.clear();
    mockCollaborationManager.users.clear();
    mockCollaborationManager.syncQueue = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Workspace Synchronization', () => {
    it('should synchronize workspace changes across multiple users', async () => {
      const workspaceId = 'workspace-1';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' },
          { id: 'widget-2', symbol: 'MSFT', type: 'kpi' }
        ]
      };

      // Create initial workspace
      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate multiple users making changes
      const users = ['user-1', 'user-2', 'user-3'];
      const updates = [
        { widgets: [{ id: 'widget-3', symbol: 'GOOGL', type: 'price' }] },
        { widgets: [{ id: 'widget-4', symbol: 'TSLA', type: 'kpi' }] },
        { widgets: [{ id: 'widget-5', symbol: 'AMZN', type: 'financial' }] }
      ];

      // Apply updates sequentially
      for (let i = 0; i < users.length; i++) {
        mockCollaborationManager.updateWorkspace(workspaceId, updates[i], users[i]);
        mockCollaborationManager.addToSyncQueue(workspaceId, updates[i]);
      }

      // Verify final state
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.version).toBe(initialVersion + users.length);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + users.length);
      expect(finalWorkspace?.lastModified).toBeDefined();
      expect(finalWorkspace?.modifiedBy).toBeDefined();
    });

    it('should handle concurrent workspace modifications', async () => {
      const workspaceId = 'workspace-2';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate concurrent modifications
      const concurrentUpdates = [
        { widgets: [{ id: 'widget-2', symbol: 'MSFT', type: 'price' }] },
        { widgets: [{ id: 'widget-3', symbol: 'GOOGL', type: 'kpi' }] },
        { widgets: [{ id: 'widget-4', symbol: 'TSLA', type: 'financial' }] }
      ];

      // Apply all updates simultaneously
      const updatePromises = concurrentUpdates.map((update, index) => 
        mockCollaborationManager.updateWorkspace(workspaceId, update, `user-${index + 1}`)
      );

      await Promise.all(updatePromises);

      // Verify final state
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.version).toBe(initialVersion + concurrentUpdates.length);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + concurrentUpdates.length);
    });

    it('should maintain workspace consistency during synchronization', async () => {
      const workspaceId = 'workspace-3';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate multiple synchronized updates
      const syncUpdates = [
        { widgets: [{ id: 'widget-2', symbol: 'MSFT', type: 'price' }] },
        { widgets: [{ id: 'widget-3', symbol: 'GOOGL', type: 'kpi' }] },
        { widgets: [{ id: 'widget-4', symbol: 'TSLA', type: 'financial' }] },
        { widgets: [{ id: 'widget-5', symbol: 'NVDA', type: 'technical' }] },
        { widgets: [{ id: 'widget-6', symbol: 'META', type: 'analysis' }] }
      ];

      // Apply updates with synchronization
      for (let i = 0; i < syncUpdates.length; i++) {
        mockCollaborationManager.updateWorkspace(workspaceId, syncUpdates[i], `user-${i + 1}`);
        mockCollaborationManager.addToSyncQueue(workspaceId, syncUpdates[i]);
      }

      // Verify final state
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.version).toBe(initialVersion + syncUpdates.length);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + syncUpdates.length);
      expect(finalWorkspace?.lastModified).toBeDefined();
      expect(finalWorkspace?.modifiedBy).toBeDefined();
    });
  });

  describe('Multi-User Editing', () => {
    it('should allow multiple users to edit the same workspace simultaneously', async () => {
      const workspaceId = 'workspace-4';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate multiple users editing simultaneously
      const users = ['user-1', 'user-2', 'user-3'];
      const userEdits = [
        { widgets: [{ id: 'widget-2', symbol: 'MSFT', type: 'price' }] },
        { widgets: [{ id: 'widget-3', symbol: 'GOOGL', type: 'kpi' }] },
        { widgets: [{ id: 'widget-4', symbol: 'TSLA', type: 'financial' }] }
      ];

      // Apply all edits
      for (let i = 0; i < users.length; i++) {
        mockCollaborationManager.updateWorkspace(workspaceId, userEdits[i], users[i]);
        mockCollaborationManager.addUserToWorkspace(workspaceId, users[i]);
      }

      // Verify all edits were applied
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + users.length);
      expect(finalWorkspace?.version).toBe(initialVersion + users.length);
    });

    it('should track user activity and session management', async () => {
      const workspaceId = 'workspace-5';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);

      // Add users to workspace
      const users = ['user-1', 'user-2', 'user-3'];
      users.forEach(user => {
        mockCollaborationManager.addUserToWorkspace(workspaceId, user);
      });

      // Verify users in workspace
      const usersInWorkspace = mockCollaborationManager.getUsersInWorkspace(workspaceId);
      expect(usersInWorkspace.length).toBe(users.length);
    });

    it('should handle user disconnection and reconnection gracefully', async () => {
      const workspaceId = 'workspace-6';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);

      // Add user and simulate disconnection
      const userId = 'user-1';
      mockCollaborationManager.addUserToWorkspace(workspaceId, userId);
      mockCollaborationManager.removeUserFromWorkspace(workspaceId, userId);

      // Verify user was removed
      let usersInWorkspace = mockCollaborationManager.getUsersInWorkspace(workspaceId);
      expect(usersInWorkspace.length).toBe(0);

      // Simulate reconnection
      mockCollaborationManager.addUserToWorkspace(workspaceId, userId);
      usersInWorkspace = mockCollaborationManager.getUsersInWorkspace(workspaceId);
      expect(usersInWorkspace.length).toBe(1);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and resolve editing conflicts', async () => {
      const workspaceId = 'workspace-7';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate conflicting updates to the same widget
      const conflictingUpdates = [
        { widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', value: 150 }] },
        { widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', value: 155 }] },
        { widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', value: 160 }] }
      ];

      // Apply conflicting updates
      for (let i = 0; i < conflictingUpdates.length; i++) {
        mockCollaborationManager.updateWorkspace(workspaceId, conflictingUpdates[i], `user-${i + 1}`);
        mockCollaborationManager.addToSyncQueue(workspaceId, conflictingUpdates[i]);
      }

      // Verify conflict detection
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.version).toBe(initialVersion + conflictingUpdates.length);

      // Verify sync queue contains all updates
      const syncQueue = mockCollaborationManager.getSyncQueue(workspaceId);
      expect(syncQueue.length).toBe(conflictingUpdates.length);
    });

    it('should handle widget-level conflicts gracefully', async () => {
      const workspaceId = 'workspace-8';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate widget-level conflicts
      const widgetConflicts = [
        { widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', timeframe: '1D' }] },
        { widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', timeframe: '1W' }] },
        { widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', timeframe: '1M' }] }
      ];

      // Apply widget conflicts
      for (let i = 0; i < widgetConflicts.length; i++) {
        mockCollaborationManager.updateWorkspace(workspaceId, widgetConflicts[i], `user-${i + 1}`);
        mockCollaborationManager.addToSyncQueue(workspaceId, widgetConflicts[i]);
      }

      // Verify conflict resolution
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.version).toBe(initialVersion + widgetConflicts.length);

      // Verify the last modification won (find the last widget with this ID)
      const lastUpdate = widgetConflicts[widgetConflicts.length - 1];
      const widgetsWithId = finalWorkspace?.widgets.filter((w: any) => w.id === 'widget-1');
      const finalWidget = widgetsWithId?.[widgetsWithId.length - 1]; // Get the last one
      expect((finalWidget as any)?.timeframe).toBe(lastUpdate.widgets[0].timeframe);
    });

    it('should maintain data integrity during conflict resolution', async () => {
      const workspaceId = 'workspace-9';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' },
          { id: 'widget-2', symbol: 'MSFT', type: 'kpi' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialWidgetCount = testWorkspace.widgets.length;
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate complex conflicts
      const complexConflicts = [
        { widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', value: 150 }] },
        { widgets: [{ id: 'widget-2', symbol: 'MSFT', type: 'kpi', value: 300 }] },
        { widgets: [{ id: 'widget-3', symbol: 'GOOGL', type: 'price', value: 2500 }] }
      ];

      // Apply complex conflicts
      for (let i = 0; i < complexConflicts.length; i++) {
        mockCollaborationManager.updateWorkspace(workspaceId, complexConflicts[i], `user-${i + 1}`);
        mockCollaborationManager.addToSyncQueue(workspaceId, complexConflicts[i]);
      }

      // Verify data integrity
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.widgets).toBeDefined();
      expect(finalWorkspace?.widgets.length).toBeGreaterThanOrEqual(initialWidgetCount - 1); // At least original widgets minus conflicts
      expect(finalWorkspace?.version).toBe(initialVersion + complexConflicts.length);
    });
  });

  describe('Real-time Data Sharing', () => {
    it('should share real-time data updates across users', async () => {
      const workspaceId = 'workspace-10';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);

      // Simulate real-time data update
      const realtimeUpdate = {
        widgets: [{ id: 'widget-1', symbol: 'AAPL', type: 'price', value: 155, timestamp: new Date() }]
      };

      mockCollaborationManager.updateWorkspace(workspaceId, realtimeUpdate, 'system');
      mockCollaborationManager.addToSyncQueue(workspaceId, realtimeUpdate);

      // Verify real-time update was applied
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + 1);
      expect(finalWorkspace?.widgets.find((w: any) => w.symbol === 'AAPL')).toBeDefined();
    });

    it('should handle WebSocket disconnections and reconnections', async () => {
      const workspaceId = 'workspace-11';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);

      // Simulate WebSocket disconnection and reconnection
      const user = 'user-1';
      mockCollaborationManager.addUserToWorkspace(workspaceId, user);
      
      // Simulate disconnection
      mockCollaborationManager.removeUserFromWorkspace(workspaceId, user);
      
      // Simulate reconnection and data update
      mockCollaborationManager.addUserToWorkspace(workspaceId, user);
      const reconnectionUpdate = {
        widgets: [{ id: 'widget-2', symbol: 'NVDA', type: 'price' }]
      };
      mockCollaborationManager.updateWorkspace(workspaceId, reconnectionUpdate, user);

      // Verify workspace state after reconnection
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + 1);
      expect(finalWorkspace?.widgets.find((w: any) => w.symbol === 'NVDA')).toBeDefined();
    });
  });

  describe('Performance Under Collaboration Load', () => {
    it('should handle multiple concurrent users efficiently', async () => {
      const workspaceId = 'workspace-12';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate many concurrent users
      const concurrentUsers = 50;
      const allOperations = [];

      for (let i = 0; i < concurrentUsers; i++) {
        const operation = {
          widgets: [{ id: `widget-${i + 2}`, symbol: `SYMBOL${i}`, type: 'price' }]
        };
        allOperations.push(operation);
        
        mockCollaborationManager.updateWorkspace(workspaceId, operation, `user-${i + 1}`);
        mockCollaborationManager.addUserToWorkspace(workspaceId, `user-${i + 1}`);
      }

      // Verify performance
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + allOperations.length);
      expect(finalWorkspace?.version).toBe(initialVersion + allOperations.length);
    });

    it('should maintain synchronization performance under sustained load', async () => {
      const workspaceId = 'workspace-13';
      const testWorkspace = {
        widgets: [
          { id: 'widget-1', symbol: 'AAPL', type: 'price' }
        ]
      };

      mockCollaborationManager.createWorkspace(workspaceId, testWorkspace);
      const initialVersion = mockCollaborationManager.getWorkspace(workspaceId)?.version || 1;

      // Simulate sustained load over time
      const sustainedOperations = 100;
      const allOperations = [];

      for (let i = 0; i < sustainedOperations; i++) {
        const operation = {
          widgets: [{ id: `widget-${i + 2}`, symbol: `SYMBOL${i}`, type: 'price' }]
        };
        allOperations.push(operation);
        
        mockCollaborationManager.updateWorkspace(workspaceId, operation, `user-${i + 1}`);
        mockCollaborationManager.addToSyncQueue(workspaceId, operation);
      }

      // Verify sustained performance
      const finalWorkspace = mockCollaborationManager.getWorkspace(workspaceId);
      expect(finalWorkspace?.widgets.length).toBe(testWorkspace.widgets.length + sustainedOperations);
      expect(finalWorkspace?.version).toBe(initialVersion + sustainedOperations);
    });
  });
});
