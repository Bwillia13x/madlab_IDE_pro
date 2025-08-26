'use client';

import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Activity, PieChart, RefreshCw, AlertCircle, Wifi, Database, Zap, Download } from 'lucide-react';

// Standardized error types for consistent error handling
export enum WidgetErrorType {
  NETWORK_ERROR = 'network',
  DATA_ERROR = 'data',
  AUTH_ERROR = 'auth',
  RATE_LIMIT = 'rate-limit',
  TIMEOUT = 'timeout',
  CONFIG_ERROR = 'config',
  UNKNOWN = 'unknown'
}

// Standardized error message component
interface StandardizedErrorProps {
  type: WidgetErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onConfigure?: () => void;
  className?: string;
}

export function StandardizedError({
  type,
  title,
  message,
  onRetry,
  onConfigure,
  className = ''
}: StandardizedErrorProps) {
  const getErrorDetails = () => {
    switch (type) {
      case WidgetErrorType.NETWORK_ERROR:
        return {
          icon: <Wifi className="h-8 w-8 text-orange-500" />,
          defaultTitle: 'Connection Error',
          defaultMessage: 'Unable to connect to the data service. Please check your internet connection.',
          actions: [
            onRetry && { label: 'Retry', action: onRetry, variant: 'primary' as const },
            { label: 'Check Network', action: () => window.open('https://www.google.com', '_blank'), variant: 'outline' as const }
          ]
        };
      case WidgetErrorType.AUTH_ERROR:
        return {
          icon: <Database className="h-8 w-8 text-red-500" />,
          defaultTitle: 'Authentication Error',
          defaultMessage: 'Please configure your API credentials to access this data.',
          actions: [
            onConfigure && { label: 'Configure API', action: onConfigure, variant: 'primary' as const },
            { label: 'Settings', action: () => window.dispatchEvent(new Event('madlab:open-settings')), variant: 'outline' as const }
          ]
        };
      case WidgetErrorType.RATE_LIMIT:
        return {
          icon: <Zap className="h-8 w-8 text-yellow-500" />,
          defaultTitle: 'Rate Limit Exceeded',
          defaultMessage: 'Too many requests. Please wait a moment before trying again.',
          actions: [
            onRetry && { label: 'Retry Later', action: onRetry, variant: 'outline' as const }
          ]
        };
      case WidgetErrorType.TIMEOUT:
        return {
          icon: <RefreshCw className="h-8 w-8 text-orange-500" />,
          defaultTitle: 'Request Timeout',
          defaultMessage: 'The request took too long to complete. Please try again.',
          actions: [
            onRetry && { label: 'Retry', action: onRetry, variant: 'primary' as const }
          ]
        };
      case WidgetErrorType.DATA_ERROR:
        return {
          icon: <Database className="h-8 w-8 text-blue-500" />,
          defaultTitle: 'Data Error',
          defaultMessage: 'Unable to load or process the requested data.',
          actions: [
            onRetry && { label: 'Retry', action: onRetry, variant: 'primary' as const }
          ]
        };
      case WidgetErrorType.CONFIG_ERROR:
        return {
          icon: <AlertCircle className="h-8 w-8 text-purple-500" />,
          defaultTitle: 'Configuration Error',
          defaultMessage: 'Please check your widget configuration and try again.',
          actions: [
            onConfigure && { label: 'Configure', action: onConfigure, variant: 'primary' as const }
          ]
        };
      default:
        return {
          icon: <AlertCircle className="h-8 w-8 text-gray-500" />,
          defaultTitle: 'Unknown Error',
          defaultMessage: 'An unexpected error occurred. Please try again.',
          actions: [
            onRetry && { label: 'Retry', action: onRetry, variant: 'primary' as const }
          ]
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <Card className={`w-full h-full bg-card/50 border-border/50 ${className}`}>
      <CardContent className="w-full h-full flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            {errorDetails.icon}
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-foreground">
              {title || errorDetails.defaultTitle}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {message || errorDetails.defaultMessage}
            </p>
          </div>
          {errorDetails.actions.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {errorDetails.actions.map((action, index) => (
                action && (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      action.variant === 'primary'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border'
                    }`}
                  >
                    {action.label}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function to classify errors
export function classifyError(error: unknown): WidgetErrorType {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return WidgetErrorType.NETWORK_ERROR;
  }
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('403')) {
    return WidgetErrorType.AUTH_ERROR;
  }
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return WidgetErrorType.RATE_LIMIT;
  }
  if (errorMessage.includes('timeout')) {
    return WidgetErrorType.TIMEOUT;
  }
  if (errorMessage.includes('config') || errorMessage.includes('invalid')) {
    return WidgetErrorType.CONFIG_ERROR;
  }
  if (errorMessage.includes('data') || errorMessage.includes('parse') || errorMessage.includes('404')) {
    return WidgetErrorType.DATA_ERROR;
  }

  return WidgetErrorType.UNKNOWN;
}

// Export utilities for widgets
export interface ExportData {
  widgetType: string;
  widgetTitle: string;
  timestamp: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export function exportToCSV(data: unknown[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0] as object);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = (row as Record<string, unknown>)[header];
        // Escape commas and quotes in CSV values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value ?? '');
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

export function exportToJSON(data: unknown, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

export function exportToPNG(element: HTMLElement, filename: string) {
  // Use html2canvas if available, otherwise fallback to basic screenshot
  if (typeof window !== 'undefined' && (window as any).html2canvas) {
    (window as any).html2canvas(element).then((canvas: HTMLCanvasElement) => {
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          downloadBlob(blob, `${filename}.png`);
        }
      });
    });
  } else {
    console.warn('html2canvas not available for PNG export');
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Hook for widget export functionality
export function useWidgetExport() {
  const exportWidget = React.useCallback((
    widgetType: string,
    widgetTitle: string,
    data: unknown,
    format: 'csv' | 'json' | 'png' = 'json',
    element?: HTMLElement
  ) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${widgetTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

    try {
      switch (format) {
        case 'csv':
          if (Array.isArray(data)) {
            exportToCSV(data, filename);
          } else {
            console.warn('CSV export requires array data');
          }
          break;
        case 'json':
          exportToJSON(data, filename);
          break;
        case 'png':
          if (element) {
            exportToPNG(element, filename);
          } else {
            console.warn('PNG export requires element reference');
          }
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      // You could show a toast notification here
    }
  }, []);

  return { exportWidget };
}

// Export button component for widgets
interface WidgetExportButtonProps {
  widgetType: string;
  widgetTitle: string;
  data: unknown;
  element?: HTMLElement;
  className?: string;
  size?: 'sm' | 'default';
}

export function WidgetExportButton({
  widgetType,
  widgetTitle,
  data,
  element,
  className = '',
  size = 'sm'
}: WidgetExportButtonProps) {
  const { exportWidget } = useWidgetExport();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleExport = (format: 'csv' | 'json' | 'png') => {
    exportWidget(widgetType, widgetTitle, data, format, element);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}
        title="Export widget data"
      >
        <Download className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {size === 'default' && 'Export'}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg py-1 min-w-[120px]">
            <button
              onClick={() => handleExport('json')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            >
              Export as JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            >
              Export as CSV
            </button>
            {element && (
              <button
                onClick={() => handleExport('png')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              >
                Export as PNG
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Enhanced skeleton components for different widget types
function ChartSkeleton() {
  return (
    <div className="w-full h-full p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground animate-pulse" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-5/6" />
        <Skeleton className="h-2 w-4/6" />
        <Skeleton className="h-2 w-3/6" />
      </div>
      <div className="flex-1 bg-muted/20 rounded-md flex items-center justify-center">
        <div className="text-center space-y-2">
          <TrendingUp className="h-8 w-8 text-muted-foreground/50 mx-auto animate-pulse" />
          <Skeleton className="h-3 w-20 mx-auto" />
        </div>
      </div>
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="w-full h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-muted-foreground animate-pulse" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-3/6" />
        <Skeleton className="h-4 w-2/6" />
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="w-full h-full p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-14" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-2 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-2 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-2 w-3/4" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function DataSkeleton() {
  return (
    <div className="w-full h-full p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function FallbackSkeleton({ widgetType }: { widgetType?: string }) {
  // Select appropriate skeleton based on widget type
  const type = widgetType?.toLowerCase() || '';

  if (type.includes('chart') || type.includes('candlestick') || type.includes('line')) {
    return <ChartSkeleton />;
  }
  if (type.includes('portfolio') || type.includes('tracker') || type.includes('allocation')) {
    return <PortfolioSkeleton />;
  }
  if (type.includes('analytics') || type.includes('kpi') || type.includes('metric')) {
    return <AnalyticsSkeleton />;
  }
  if (type.includes('data') || type.includes('table') || type.includes('screener')) {
    return <DataSkeleton />;
  }

  // Default generic skeleton
  return (
    <div className="w-full h-full p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex-1 bg-muted/10 rounded-md flex items-center justify-center">
        <div className="text-center space-y-2">
          <Activity className="h-6 w-6 text-muted-foreground/50 mx-auto animate-pulse" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      </div>
    </div>
  );
}

class Boundary extends React.Component<
  { children: React.ReactNode; widgetType?: string; widgetTitle?: string },
  { hasError: boolean; message?: string; retryCount: number }
>{
  constructor(props: { children: React.ReactNode; widgetType?: string; widgetTitle?: string }) {
    super(props);
    this.state = { hasError: false, message: '', retryCount: 0 };
  }

  static getDerivedStateFromError(err: unknown) {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Unknown widget error',
      retryCount: 0
    };
  }

  componentDidCatch(err: unknown) {
    console.warn(`Widget "${this.props.widgetTitle || this.props.widgetType}" render error:`, err);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '', retryCount: this.state.retryCount + 1 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full h-full bg-destructive/5 border-destructive/20">
          <CardContent className="w-full h-full flex items-center justify-center p-4">
            <div className="text-center space-y-3 max-w-sm">
              <div className="text-destructive">
                <Activity className="h-8 w-8 mx-auto mb-2" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm text-foreground">Widget Error</h3>
                <p className="text-xs text-muted-foreground">
                  {this.props.widgetTitle || this.props.widgetType || 'This widget'} encountered an error
                </p>
                {this.state.message && (
                  <details className="text-xs text-muted-foreground mt-2">
                    <summary className="cursor-pointer hover:text-foreground">Error details</summary>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">{this.state.message}</pre>
                  </details>
                )}
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Retry attempts: {this.state.retryCount}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

interface WidgetShellProps {
  children: React.ReactNode;
  widgetType?: string;
  widgetTitle?: string;
}

export function WidgetShell({ children, widgetType, widgetTitle }: WidgetShellProps) {
  return (
    <Boundary widgetType={widgetType} widgetTitle={widgetTitle}>
      <Suspense fallback={<FallbackSkeleton widgetType={widgetType} />}>
        {children}
      </Suspense>
    </Boundary>
  );
}

// Keyboard shortcuts registry
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'editing' | 'workspace' | 'tools';
}

class KeyboardShortcutsManager {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private listeners = new Set<(shortcut: KeyboardShortcut, event: KeyboardEvent) => void>();

  register(shortcut: KeyboardShortcut) {
    const key = this.createKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  unregister(shortcut: KeyboardShortcut) {
    const key = this.createKey(shortcut);
    this.shortcuts.delete(key);
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  handleKeyDown(event: KeyboardEvent) {
    // Don't handle shortcuts when user is typing in inputs
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true') {
      return;
    }

    const shortcut = this.findMatchingShortcut(event);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();

      // Notify listeners
      this.listeners.forEach(listener => listener(shortcut, event));
    }
  }

  addListener(listener: (shortcut: KeyboardShortcut, event: KeyboardEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private createKey(shortcut: KeyboardShortcut): string {
    return `${shortcut.key.toLowerCase()}-${!!shortcut.ctrlKey}-${!!shortcut.shiftKey}-${!!shortcut.altKey}-${!!shortcut.metaKey}`;
  }

  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | null {
    const key = event.key.toLowerCase();
    const keyPattern = `${key}-${!!event.ctrlKey}-${!!event.shiftKey}-${!!event.altKey}-${!!event.metaKey}`;
    return this.shortcuts.get(keyPattern) || null;
  }
}

export const keyboardShortcutsManager = new KeyboardShortcutsManager();

// Hook to use keyboard shortcuts
export function useKeyboardShortcuts() {
  const [pressedShortcut, setPressedShortcut] = React.useState<KeyboardShortcut | null>(null);

  React.useEffect(() => {
    const handleShortcut = (shortcut: KeyboardShortcut, event: KeyboardEvent) => {
      setPressedShortcut(shortcut);
      setTimeout(() => setPressedShortcut(null), 1000); // Clear after 1 second
    };

    const unsubscribe = keyboardShortcutsManager.addListener(handleShortcut);

    const handleKeyDown = (event: KeyboardEvent) => {
      keyboardShortcutsManager.handleKeyDown(event);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unsubscribe();
    };
  }, []);

  return {
    pressedShortcut,
    allShortcuts: keyboardShortcutsManager.getAllShortcuts(),
    shortcutsByCategory: {
      navigation: keyboardShortcutsManager.getShortcutsByCategory('navigation'),
      editing: keyboardShortcutsManager.getShortcutsByCategory('editing'),
      workspace: keyboardShortcutsManager.getShortcutsByCategory('workspace'),
      tools: keyboardShortcutsManager.getShortcutsByCategory('tools'),
    }
  };
}

// Keyboard shortcuts help component
export function KeyboardShortcutsHelp() {
  const { shortcutsByCategory } = useKeyboardShortcuts();

  const formatKey = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey || shortcut.metaKey) keys.push('⌘');
    if (shortcut.altKey) keys.push('⌥');
    if (shortcut.shiftKey) keys.push('⇧');
    keys.push(shortcut.key.toUpperCase());
    return keys.join('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
        <p className="text-muted-foreground">VS Code-style shortcuts for power users</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
          <div key={category} className="space-y-3">
            <h3 className="font-semibold text-lg capitalize">{category}</h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
                  <span className="text-sm">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border border-border font-mono">
                    {formatKey(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

