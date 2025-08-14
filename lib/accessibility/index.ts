/**
 * Accessibility utilities and constants for WCAG 2.1 compliance
 * Focused on financial data accessibility requirements
 */

// ARIA roles specific to financial applications
export const FINANCIAL_ARIA_ROLES = {
  PRICE_DISPLAY: 'status',
  CHART: 'img',
  DATA_TABLE: 'table',
  TRADING_PANEL: 'region',
  ALERT_PANEL: 'alert',
  LIVE_UPDATE: 'status',
  NAVIGATION_PANEL: 'navigation',
  TOOLBAR: 'toolbar',
  MENU: 'menu',
  DIALOG: 'dialog',
} as const;

// ARIA live regions for financial updates
export const LIVE_REGIONS = {
  POLITE: 'polite', // For non-critical updates like price changes
  ASSERTIVE: 'assertive', // For critical alerts like stop losses
  OFF: 'off', // Disable live updates
} as const;

// Screen reader friendly financial number formatting
export function formatForScreenReader(
  value: number | null | undefined,
  type: 'currency' | 'percentage' | 'number' | 'volume',
  currency = 'USD'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'No data available';
  }

  switch (type) {
    case 'currency':
      const absValue = Math.abs(value);
      const sign = value < 0 ? 'negative ' : '';
      
      if (absValue >= 1_000_000_000) {
        return `${sign}${(value / 1_000_000_000).toFixed(1)} billion ${currency}`;
      } else if (absValue >= 1_000_000) {
        return `${sign}${(value / 1_000_000).toFixed(1)} million ${currency}`;
      } else if (absValue >= 1_000) {
        return `${sign}${(value / 1_000).toFixed(1)} thousand ${currency}`;
      } else {
        return `${sign}${value.toFixed(2)} ${currency}`;
      }

    case 'percentage':
      const percentSign = value >= 0 ? 'positive' : 'negative';
      return `${percentSign} ${Math.abs(value).toFixed(2)} percent`;

    case 'volume':
      const volumeValue = Math.abs(value);
      if (volumeValue >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)} million shares`;
      } else if (volumeValue >= 1_000) {
        return `${(value / 1_000).toFixed(1)} thousand shares`;
      } else {
        return `${value.toLocaleString()} shares`;
      }

    case 'number':
    default:
      return value.toLocaleString();
  }
}

// Generate accessible chart descriptions
export function generateChartDescription(
  data: Array<{ date: string; value: number }>,
  title: string,
  type: 'line' | 'bar' | 'candlestick' = 'line'
): string {
  if (!data || data.length === 0) {
    return `${title} chart with no data available`;
  }

  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const change = lastPoint.value - firstPoint.value;
  const changePercent = (change / firstPoint.value) * 100;

  const trend = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'remained stable';
  const changeDescription = Math.abs(changePercent) < 0.01 ? 
    'with minimal change' : 
    `by ${Math.abs(changePercent).toFixed(1)} percent`;

  return `${title} ${type} chart showing data from ${firstPoint.date} to ${lastPoint.date}. ` +
    `The value ${trend} from ${firstPoint.value.toFixed(2)} to ${lastPoint.value.toFixed(2)} ${changeDescription}. ` +
    `Minimum value: ${minValue.toFixed(2)}, Maximum value: ${maxValue.toFixed(2)}, ` +
    `Total data points: ${data.length}`;
}

// Color contrast ratios for WCAG AA compliance
export const COLOR_CONTRAST = {
  AA_NORMAL: 4.5, // Minimum contrast ratio for normal text
  AA_LARGE: 3.0, // Minimum contrast ratio for large text (18pt+ or 14pt+ bold)
  AAA_NORMAL: 7.0, // Enhanced contrast ratio for normal text
  AAA_LARGE: 4.5, // Enhanced contrast ratio for large text
} as const;

// Check color contrast ratio
export function getContrastRatio(foreground: string, background: string): number {
  // Convert hex colors to RGB
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);
  
  if (!fgRgb || !bgRgb) return 1; // Return minimum ratio if conversion fails
  
  // Calculate relative luminance
  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  
  // Calculate contrast ratio
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper function to get relative luminance
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Keyboard navigation helpers
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

// Focus management utilities
export function createFocusTrap(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  function handleTabKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }
  
  element.addEventListener('keydown', handleTabKey);
  
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

// Announce dynamic content changes to screen readers
let liveRegionEl: HTMLDivElement | null = null;
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;
  if (!liveRegionEl) {
    liveRegionEl = document.createElement('div');
    liveRegionEl.setAttribute('aria-atomic', 'true');
    liveRegionEl.style.position = 'absolute';
    liveRegionEl.style.left = '-10000px';
    liveRegionEl.style.width = '1px';
    liveRegionEl.style.height = '1px';
    liveRegionEl.style.overflow = 'hidden';
    document.body.appendChild(liveRegionEl);
  }

  // Update priority each time in case callers change intent
  liveRegionEl.setAttribute('aria-live', priority);
  
  // Clear then set to ensure SRs announce changes reliably
  liveRegionEl.textContent = '';
  // In tests, avoid timeouts for determinism
  if (process.env.NODE_ENV === 'test') {
    liveRegionEl.textContent = message;
  } else {
    setTimeout(() => { liveRegionEl && (liveRegionEl.textContent = message); }, 50);
    // Clear after a short delay but keep node for reuse (no removal to avoid races)
    setTimeout(() => { liveRegionEl && (liveRegionEl.textContent = ''); }, 2000);
  }
}

// Skip link component data
export interface SkipLink {
  id: string;
  label: string;
  target: string;
}

export const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { id: 'skip-to-main', label: 'Skip to main content', target: '#main-content' },
  { id: 'skip-to-nav', label: 'Skip to navigation', target: '#navigation' },
  { id: 'skip-to-search', label: 'Skip to search', target: '#search' },
];

// ARIA label generators for financial components
export function generateAriaLabel(
  componentType: 'widget' | 'chart' | 'table' | 'panel',
  title: string,
  additionalInfo?: string
): string {
  const baseLabel = `${title} ${componentType}`;
  return additionalInfo ? `${baseLabel}, ${additionalInfo}` : baseLabel;
}

// Financial widget accessibility metadata
export interface WidgetA11yMetadata {
  role: string;
  ariaLabel: string;
  ariaDescription?: string;
  liveRegion?: 'polite' | 'assertive' | 'off';
  keyboardInstructions?: string;
}

export function getWidgetA11yMetadata(
  widgetType: string,
  title: string,
  data?: any
): WidgetA11yMetadata {
  const baseMetadata: WidgetA11yMetadata = {
    role: FINANCIAL_ARIA_ROLES.TRADING_PANEL,
    ariaLabel: generateAriaLabel('widget', title),
  };

  switch (widgetType) {
    case 'line-chart':
    case 'bar-chart':
    case 'candlestick-chart':
      return {
        ...baseMetadata,
        role: FINANCIAL_ARIA_ROLES.CHART,
        ariaDescription: data ? generateChartDescription(data, title) : undefined,
        keyboardInstructions: 'Use arrow keys to navigate data points, Enter to select',
      };

    case 'kpi-card':
      return {
        ...baseMetadata,
        role: FINANCIAL_ARIA_ROLES.PRICE_DISPLAY,
        liveRegion: 'polite',
        ariaDescription: 'Financial key performance indicators',
      };

    case 'data-table':
      return {
        ...baseMetadata,
        role: FINANCIAL_ARIA_ROLES.DATA_TABLE,
        keyboardInstructions: 'Use arrow keys to navigate table cells, Enter to sort columns',
      };

    default:
      return baseMetadata;
  }
}