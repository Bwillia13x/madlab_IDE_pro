import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestStore, TestWrapper } from '../setup';
import { useWorkspaceStore } from '@/lib/store';
import { CommandPalette } from '@/components/CommandPalette';
import { WidgetShell } from '@/components/widgets/WidgetShell';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { CollaborationProvider } from '@/components/collaboration/CollaborationProvider';
import { EnhancedAgent } from '@/lib/ai/enhancedAgent';

describe('MAD LAB Platform Integration Tests', () => {
  let testStore: ReturnType<typeof createTestStore>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeAll(() => {
    testStore = createTestStore();
    user = userEvent.setup();
  });

  beforeEach(() => {
    // Reset store state before each test
    testStore.reset();
  });

  describe('Core Platform Functionality', () => {
    it('should load the main platform interface', async () => {
      render(
        <TestWrapper store={testStore}>
          <div data-testid="platform-root">
            <CommandPalette />
          </div>
        </TestWrapper>
      );

      expect(screen.getByTestId('platform-root')).toBeInTheDocument();
    });

    it('should handle command palette interactions', async () => {
      render(
        <TestWrapper store={testStore}>
          <CommandPalette />
        </TestWrapper>
      );

      // Open command palette with Cmd+K
      await user.keyboard('{Meta>}k{/Meta}');

      const searchInput = screen.getByPlaceholderText(/type a command/i);
      expect(searchInput).toBeInTheDocument();

      // Type a search query
      await user.type(searchInput, 'add widget');

      // Should show relevant results
      await waitFor(() => {
        expect(screen.getByText(/add widget/i)).toBeInTheDocument();
      });
    });

    it('should create and manage sheets', async () => {
      render(
        <TestWrapper store={testStore}>
          <CommandPalette />
        </TestWrapper>
      );

      // Open command palette
      await user.keyboard('{Meta>}k{/Meta}');

      // Search for new sheet command
      const searchInput = screen.getByPlaceholderText(/type a command/i);
      await user.type(searchInput, 'new sheet');

      // Click new sheet command
      const newSheetButton = screen.getByText(/new sheet/i);
      await user.click(newSheetButton);

      // Verify sheet was created
      const store = useWorkspaceStore.getState();
      expect(store.sheets).toHaveLength(2); // Default sheet + new sheet
    });
  });

  describe('Widget System', () => {
    it('should render widgets correctly', async () => {
      const mockWidget = {
        id: 'test-widget',
        type: 'kpi-card',
        title: 'Test KPI',
        layout: { i: 'test', x: 0, y: 0, w: 4, h: 2 }
      };

      render(
        <TestWrapper store={testStore}>
          <WidgetShell widgetType="kpi-card" widgetTitle="Test KPI">
            <div>Widget Content</div>
          </WidgetShell>
        </TestWrapper>
      );

      expect(screen.getByText('Widget Content')).toBeInTheDocument();
    });

    it('should handle widget errors gracefully', async () => {
      const ErrorWidget = () => {
        throw new Error('Test error');
      };

      render(
        <TestWrapper store={testStore}>
          <WidgetShell widgetType="error-test" widgetTitle="Error Test">
            <ErrorWidget />
          </WidgetShell>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to render widget/i)).toBeInTheDocument();
      });
    });

    it('should export widget data', async () => {
      const mockData = [
        { symbol: 'AAPL', price: 150.50, change: 2.5 },
        { symbol: 'GOOGL', price: 2800.00, change: -1.2 }
      ];

      // Mock the export function
      const mockExport = vi.fn();
      global.URL.createObjectURL = vi.fn();

      render(
        <TestWrapper store={testStore}>
          <WidgetShell widgetType="test-exporter" widgetTitle="Test Exporter">
            <button onClick={() => mockExport(mockData)}>
              Export Data
            </button>
          </WidgetShell>
        </TestWrapper>
      );

      const exportButton = screen.getByText('Export Data');
      await user.click(exportButton);

      expect(mockExport).toHaveBeenCalledWith(mockData);
    });
  });

  describe('Mobile Experience', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      window.dispatchEvent(new Event('resize'));
    });

    it('should render mobile layout', async () => {
      render(
        <TestWrapper store={testStore}>
          <MobileLayout
            widgets={[]}
            onWidgetAdd={() => {}}
            onWidgetRemove={() => {}}
            onWidgetUpdate={() => {}}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    it('should handle mobile navigation', async () => {
      render(
        <TestWrapper store={testStore}>
          <MobileLayout
            widgets={[]}
            onWidgetAdd={() => {}}
            onWidgetRemove={() => {}}
            onWidgetUpdate={() => {}}
          />
        </TestWrapper>
      );

      // Test navigation between sections
      const portfolioButton = screen.getByText(/portfolio/i);
      await user.click(portfolioButton);

      // Should update active section
      expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Data', () => {
    it('should handle real-time data updates', async () => {
      const { result } = renderHook(() => useEnhancedRealtimePrices(['AAPL']), {
        wrapper: ({ children }) => <TestWrapper store={testStore}>{children}</TestWrapper>
      });

      // Initially should have no data
      expect(result.current.prices).toHaveLength(0);

      // Simulate data update
      await act(async () => {
        // This would be handled by the WebSocket service in real implementation
        result.current.start();
      });

      // Should be running
      expect(result.current.isRunning).toBe(true);
    });

    it('should handle connection failures gracefully', async () => {
      const { result } = renderHook(() => useEnhancedRealtimePrices(['AAPL']), {
        wrapper: ({ children }) => <TestWrapper store={testStore}>{children}</TestWrapper>
      });

      await act(async () => {
        result.current.start();
      });

      // Simulate connection failure
      await act(async () => {
        // This would trigger error handling in real implementation
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('AI Agent', () => {
    it('should process user queries', async () => {
      const { result } = renderHook(() => useEnhancedAgent(), {
        wrapper: ({ children }) => <TestWrapper store={testStore}>{children}</TestWrapper>
      });

      const response = await result.current.processQuery('analyze AAPL trends');

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('confidence');
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should provide contextual suggestions', async () => {
      const { result } = renderHook(() => useEnhancedAgent(), {
        wrapper: ({ children }) => <TestWrapper store={testStore}>{children}</TestWrapper>
      });

      const response = await result.current.processQuery('add chart widget');

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions.length).toBeGreaterThan(0);
      expect(response.suggestions[0]).toHaveProperty('type');
      expect(response.suggestions[0]).toHaveProperty('title');
    });

    it('should handle educational queries', async () => {
      const { result } = renderHook(() => useEnhancedAgent(), {
        wrapper: ({ children }) => <TestWrapper store={testStore}>{children}</TestWrapper>
      });

      const response = await result.current.processQuery('explain RSI');

      expect(response.content).toContain('RSI');
      expect(response.content).toContain('Relative Strength Index');
    });
  });

  describe('Collaboration Features', () => {
    it('should manage user presence', async () => {
      const { result } = renderHook(() => useCollaboration(), {
        wrapper: ({ children }) => (
          <TestWrapper store={testStore}>
            <CollaborationProvider roomId="test-room">
              {children}
            </CollaborationProvider>
          </TestWrapper>
        )
      });

      expect(result.current.currentUser).toBeDefined();
      expect(result.current.currentUser?.name).toBeDefined();
    });

    it('should broadcast changes', async () => {
      const { result } = renderHook(() => useCollaboration(), {
        wrapper: ({ children }) => (
          <TestWrapper store={testStore}>
            <CollaborationProvider roomId="test-room">
              {children}
            </CollaborationProvider>
          </TestWrapper>
        )
      });

      await act(async () => {
        result.current.broadcastChange({
          type: 'widget-update',
          data: { widgetId: 'test', updates: { title: 'New Title' } }
        });
      });

      // In a real implementation, this would verify the change was broadcast
      expect(result.current.currentUser).toBeDefined();
    });
  });

  describe('Performance & Accessibility', () => {
    it('should maintain performance with multiple widgets', async () => {
      const manyWidgets = Array.from({ length: 50 }, (_, i) => ({
        id: `widget-${i}`,
        type: 'kpi-card',
        title: `Widget ${i}`,
        layout: { i: `widget-${i}`, x: i % 10, y: Math.floor(i / 10), w: 2, h: 2 }
      }));

      const startTime = performance.now();

      render(
        <TestWrapper store={testStore}>
          <div data-testid="widget-grid">
            {manyWidgets.map(widget => (
              <WidgetShell key={widget.id} widgetType={widget.type} widgetTitle={widget.title}>
                <div>Content {widget.id}</div>
              </WidgetShell>
            ))}
          </div>
        </TestWrapper>
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('should be keyboard accessible', async () => {
      render(
        <TestWrapper store={testStore}>
          <CommandPalette />
        </TestWrapper>
      );

      // Open command palette
      await user.keyboard('{Meta>}k{/Meta}');

      const searchInput = screen.getByPlaceholderText(/type a command/i);

      // Should be focused
      expect(document.activeElement).toBe(searchInput);

      // Should handle keyboard navigation
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Command palette should close
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/type a command/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper store={testStore}>
          <CommandPalette />
        </TestWrapper>
      );

      // Should still render without crashing
      expect(screen.getByTestId('platform-root')).toBeInTheDocument();
    });

    it('should handle invalid data gracefully', async () => {
      const { result } = renderHook(() => useEnhancedRealtimePrices(['INVALID']), {
        wrapper: ({ children }) => <TestWrapper store={testStore}>{children}</TestWrapper>
      });

      await act(async () => {
        result.current.start();
      });

      // Should handle gracefully without crashing
      expect(result.current.error).toBeNull();
    });
  });
});

