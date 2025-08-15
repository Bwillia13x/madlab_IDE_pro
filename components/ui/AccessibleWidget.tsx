/**
 * AccessibleWidget Component
 * WCAG 2.1 compliant wrapper for financial widgets with comprehensive accessibility features
 */

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getWidgetA11yMetadata,
  announceToScreenReader,
  createFocusTrap,
  KEYBOARD_KEYS,
  type WidgetA11yMetadata,
} from '@/lib/accessibility';
import { Button } from './button';
import {
  HelpCircle,
  Settings,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface AccessibleWidgetProps {
  widgetType: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  onConfigure?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
  data?: unknown;
  customA11yMetadata?: Partial<WidgetA11yMetadata>;
  enableLiveUpdates?: boolean;
  helpText?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function AccessibleWidget({
  widgetType,
  title,
  children,
  className,
  isSelected = false,
  onSelect,
  onConfigure,
  onRefresh,
  loading = false,
  error = null,
  data,
  customA11yMetadata,
  enableLiveUpdates = false,
  helpText,
  isMinimized = false,
  onToggleMinimize,
}: AccessibleWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(enableLiveUpdates);
  const [focusTrapCleanup, setFocusTrapCleanup] = useState<(() => void) | null>(null);

  // Get accessibility metadata
  const a11yMetadata = {
    ...getWidgetA11yMetadata(widgetType, title, data),
    ...customA11yMetadata,
  };

  // Generate unique IDs for ARIA relationships
  const titleId = `${widgetType}-${title.replace(/\s+/g, '-').toLowerCase()}-title`;
  const descriptionId = `${titleId}-description`;
  const helpId = `${titleId}-help`;
  const liveRegionId = `${titleId}-live`;

  // Handle widget focus
  useEffect(() => {
    if (isSelected && widgetRef.current) {
      widgetRef.current.focus();

      // Set up focus trap for selected widget
      if (onConfigure) {
        const cleanup = createFocusTrap(widgetRef.current);
        setFocusTrapCleanup(() => cleanup);

        return () => {
          cleanup();
          setFocusTrapCleanup(null);
        };
      }
    }
  }, [isSelected, onConfigure]);

  // Handle keyboard interactions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        if (onSelect) {
          event.preventDefault();
          onSelect();
        }
        break;

      case 'c':
      case 'C':
        if (event.ctrlKey || event.metaKey) {
          // Allow default copy behavior
          return;
        }
        if (onConfigure) {
          event.preventDefault();
          onConfigure();
        }
        break;

      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          // Allow default refresh behavior
          return;
        }
        if (onRefresh) {
          event.preventDefault();
          onRefresh();
        }
        break;

      case 'm':
      case 'M':
        if (onToggleMinimize) {
          event.preventDefault();
          onToggleMinimize();
        }
        break;

      case 'h':
      case 'H':
        if (helpText) {
          event.preventDefault();
          announceToScreenReader(helpText, 'polite');
        }
        break;

      case KEYBOARD_KEYS.ESCAPE:
        if (isFocused) {
          setIsFocused(false);
          widgetRef.current?.blur();
        }
        break;
    }
  };

  // Announce status changes
  const announceStatus = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveUpdatesEnabled) {
      announceToScreenReader(message, priority);
    }
  };

  // Handle loading state changes
  useEffect(() => {
    if (loading) {
      announceStatus('Loading data');
    }
  }, [loading, announceStatus]);

  // Handle error state changes
  useEffect(() => {
    if (error) {
      announceStatus(`Error: ${error}`, 'assertive');
    }
  }, [error, announceStatus]);

  // Toggle live updates
  const handleToggleLiveUpdates = () => {
    setLiveUpdatesEnabled(!liveUpdatesEnabled);
    announceStatus(liveUpdatesEnabled ? 'Live updates disabled' : 'Live updates enabled', 'polite');
  };

  return (
    <div
      ref={widgetRef}
      role={a11yMetadata.role}
      aria-label={a11yMetadata.ariaLabel}
      aria-describedby={`${descriptionId} ${helpText ? helpId : ''}`}
      aria-live={liveUpdatesEnabled ? a11yMetadata.liveRegion : 'off'}
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        'relative rounded-lg border bg-card text-card-foreground shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'transition-all duration-200',
        isSelected && 'ring-2 ring-primary',
        error && 'border-destructive',
        className
      )}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={onSelect}
    >
      {/* Widget header with accessibility controls */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex-1">
          <h3 id={titleId} className="font-medium text-sm leading-none">
            {title}
          </h3>
          {loading && (
            <div className="flex items-center gap-1 mt-1">
              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          )}
          {error && (
            <div className="text-xs text-destructive mt-1" role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Accessibility toolbar */}
        <div className="flex items-center gap-1">
          {/* Live updates toggle */}
          {enableLiveUpdates && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleToggleLiveUpdates}
              aria-label={`${liveUpdatesEnabled ? 'Disable' : 'Enable'} live updates`}
              title="Toggle live updates"
            >
              {liveUpdatesEnabled ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
            </Button>
          )}

          {/* Help button */}
          {helpText && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  aria-label="What is this?"
                  title="What is this?"
                >
                  <Info className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm leading-relaxed">
                <div className="font-medium mb-1">What is this?</div>
                <p className="text-muted-foreground">{helpText}</p>
              </PopoverContent>
            </Popover>
          )}

          {/* Minimize/maximize toggle */}
          {onToggleMinimize && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onToggleMinimize}
              aria-label={isMinimized ? 'Maximize widget' : 'Minimize widget'}
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          )}

          {/* Configure button */}
          {onConfigure && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onConfigure}
              aria-label="Configure widget"
              title="Configure widget (Press C)"
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onRefresh}
              aria-label="Refresh widget data"
              title="Refresh data (Press R)"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Widget content */}
      <div className={cn('p-3', isMinimized && 'hidden')} aria-hidden={isMinimized}>
        {children}
      </div>

      {/* Hidden description for screen readers */}
      {a11yMetadata.ariaDescription && (
        <div id={descriptionId} className="sr-only">
          {a11yMetadata.ariaDescription}
        </div>
      )}

      {/* Hidden help text */}
      {helpText && (
        <div id={helpId} className="sr-only">
          {helpText}
        </div>
      )}

      {/* Live region for dynamic announcements */}
      <div
        id={liveRegionId}
        aria-live={liveUpdatesEnabled ? 'polite' : 'off'}
        aria-atomic="true"
        className="sr-only"
      />

      {/* Keyboard instructions for screen readers */}
      <div className="sr-only">
        Keyboard shortcuts:
        {onConfigure && ' Press C to configure.'}
        {onRefresh && ' Press R to refresh data.'}
        {onToggleMinimize && ' Press M to minimize or maximize.'}
        {helpText && ' Press H for help.'}
        {' Press Escape to deselect.'}
      </div>

      {/* Focus indicator for keyboard navigation */}
      {isFocused && (
        <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none" />
      )}

      {/* Minimized state indicator */}
      {isMinimized && (
        <div className="p-3 text-center text-sm text-muted-foreground">Widget minimized</div>
      )}
    </div>
  );
}

// Higher-order component to wrap existing widgets with accessibility
export function withAccessibility<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  widgetType: string,
  defaultTitle: string
) {
  const AccessibleWrappedComponent = (
    props: P & {
      title?: string;
      isSelected?: boolean;
      onSelect?: () => void;
      onConfigure?: () => void;
      onRefresh?: () => void;
      loading?: boolean;
      error?: string | null;
    }
  ) => {
    const {
      title = defaultTitle,
      isSelected,
      onSelect,
      onConfigure,
      onRefresh,
      loading,
      error,
      ...wrappedProps
    } = props;

    return (
      <AccessibleWidget
        widgetType={widgetType}
        title={title}
        isSelected={isSelected}
        onSelect={onSelect}
        onConfigure={onConfigure}
        onRefresh={onRefresh}
        loading={loading}
        error={error}
      >
        <WrappedComponent {...(wrappedProps as P)} />
      </AccessibleWidget>
    );
  };

  AccessibleWrappedComponent.displayName = `withAccessibility(${WrappedComponent.displayName || WrappedComponent.name})`;

  return AccessibleWrappedComponent;
}
