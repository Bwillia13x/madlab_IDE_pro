/**
 * FinancialNumber Component
 * Professional-grade number formatting for financial data
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { formatForScreenReader } from '@/lib/accessibility';

interface FinancialNumberProps {
  value: number | null | undefined;
  type?: 'currency' | 'percentage' | 'number' | 'price' | 'volume' | 'ratio';
  currency?: string;
  precision?: number;
  className?: string;
  showSign?: boolean;
  compact?: boolean;
  density?: 'normal' | 'dense' | 'comfortable';
  alignment?: 'left' | 'right' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function FinancialNumber({
  value,
  type = 'number',
  currency = 'USD',
  precision,
  className,
  showSign = false,
  compact = false,
  density = 'normal',
  alignment = 'right',
  size = 'md',
}: FinancialNumberProps) {
  // Handle null/undefined values
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <span 
        className={cn(getBaseClasses(type, density, alignment, size), 'text-muted-foreground', className)}
        aria-label="No data available"
        role="status"
      >
        —
      </span>
    );
  }

  // Format the number based on type
  const formattedValue = formatFinancialNumber(value, type, currency, precision, compact);
  const displayValue = showSign && value > 0 ? `+${formattedValue}` : formattedValue;
  
  // Determine color classes for percentage and change values
  const colorClass = getColorClass(value, type);
  
  // Generate screen reader friendly text
  const ariaType: 'currency' | 'percentage' | 'number' | 'volume' =
    type === 'price' ? 'currency' : (['currency', 'percentage', 'number', 'volume'].includes(type) ? (type as any) : 'number');
  const ariaLabel = formatForScreenReader(value, ariaType, currency);
  
  return (
    <span 
      className={cn(
        getBaseClasses(type, density, alignment, size),
        colorClass,
        className
      )}
      title={getTooltipValue(value, type, currency)}
      aria-label={ariaLabel}
      role="status"
    >
      {displayValue}
    </span>
  );
}

// Helper function to get base CSS classes
function getBaseClasses(
  type: FinancialNumberProps['type'],
  density: FinancialNumberProps['density'],
  alignment: FinancialNumberProps['alignment'],
  size: FinancialNumberProps['size']
): string {
  const classes = ['financial-number'];
  
  // Type-specific classes
  switch (type) {
    case 'currency':
    case 'price':
      classes.push('financial-price');
      break;
    case 'percentage':
      classes.push('percentage');
      break;
    case 'volume':
      classes.push('financial-volume');
      break;
  }
  
  // Density classes
  switch (density) {
    case 'dense':
      classes.push('financial-data-dense');
      break;
    case 'comfortable':
      classes.push('leading-relaxed');
      break;
  }
  
  // Alignment classes
  switch (alignment) {
    case 'left':
      classes.push('text-left');
      break;
    case 'center':
      classes.push('text-center');
      break;
    case 'right':
      classes.push('text-right');
      break;
  }
  
  // Size classes
  switch (size) {
    case 'sm':
      classes.push('text-sm');
      break;
    case 'md':
      classes.push('text-base');
      break;
    case 'lg':
      classes.push('text-lg font-semibold');
      break;
    case 'xl':
      classes.push('text-xl font-bold');
      break;
  }
  
  return classes.join(' ');
}

// Helper function to determine color based on value and type
function getColorClass(value: number, type: FinancialNumberProps['type']): string {
  if (type === 'percentage') {
    return value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  }
  return '';
}

// Helper function to format numbers
function formatFinancialNumber(
  value: number,
  type: FinancialNumberProps['type'],
  currency: string,
  precision?: number,
  compact?: boolean
): string {
  switch (type) {
    case 'currency':
    case 'price':
      return formatCurrency(value, currency, precision, compact);
    case 'percentage':
      return formatPercentage(value, precision);
    case 'volume':
      return formatVolume(value, compact);
    case 'ratio':
      return formatRatio(value, precision);
    case 'number':
    default:
      return formatNumber(value, precision, compact);
  }
}

// Currency formatting
function formatCurrency(value: number, currency: string, precision?: number, compact?: boolean): string {
  const absValue = Math.abs(value);
  let decimalPlaces = precision;
  
  if (decimalPlaces === undefined) {
    // Auto-determine decimal places based on magnitude
    if (absValue >= 1000000) {
      decimalPlaces = 0;
    } else if (absValue >= 1000) {
      decimalPlaces = 0;
    } else if (absValue >= 10) {
      decimalPlaces = 2;
    } else if (absValue >= 1) {
      decimalPlaces = 2;
    } else {
      decimalPlaces = 4;
    }
  }
  
  if (compact) {
    return formatCompactCurrency(value, currency, decimalPlaces);
  }
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
  } catch {
    // Fallback for invalid currency codes
    return `${currency} ${formatNumber(value, decimalPlaces, false)}`;
  }
}

// Compact currency formatting (e.g., $1.2M, $500K)
function formatCompactCurrency(value: number, currency: string, precision: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const symbol = getCurrencySymbol(currency);
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${symbol}${(value / 1_000_000_000).toFixed(precision)}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}${symbol}${(value / 1_000_000).toFixed(precision)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}${symbol}${(value / 1_000).toFixed(precision)}K`;
  } else {
    return `${sign}${symbol}${value.toFixed(precision)}`;
  }
}

// Percentage formatting
function formatPercentage(value: number, precision?: number): string {
  const decimalPlaces = precision ?? 2;
  return `${value.toFixed(decimalPlaces)}%`;
}

// Volume formatting (always compact for readability)
function formatVolume(value: number, compact?: boolean): string {
  if (compact !== false) {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (absValue >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    } else if (absValue >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
  }
  
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

// Ratio formatting (e.g., P/E ratios)
function formatRatio(value: number, precision?: number): string {
  const decimalPlaces = precision ?? 2;
  return value.toFixed(decimalPlaces);
}

// General number formatting
function formatNumber(value: number, precision?: number, compact?: boolean): string {
  if (compact) {
    return formatVolume(value, true);
  }
  
  const decimalPlaces = precision ?? (Math.abs(value) < 1 ? 4 : 2);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

// Get currency symbol
function getCurrencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).formatToParts(0).find(part => part.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
}

// Get tooltip value for additional context
function getTooltipValue(value: number, type: FinancialNumberProps['type'], currency: string): string {
  switch (type) {
    case 'currency':
    case 'price':
      return `Exact value: ${formatCurrency(value, currency, 4, false)}`;
    case 'percentage':
      return `Exact value: ${value.toFixed(4)}%`;
    case 'volume':
      return `Exact volume: ${new Intl.NumberFormat('en-US').format(value)}`;
    default:
      return `Exact value: ${value}`;
  }
}

// Convenience components for common use cases
export function Price({ value, currency = 'USD', ...props }: Omit<FinancialNumberProps, 'type'>) {
  return <FinancialNumber value={value} type="price" currency={currency} {...props} />;
}

export function Percentage({ value, ...props }: Omit<FinancialNumberProps, 'type'>) {
  return <FinancialNumber value={value} type="percentage" {...props} />;
}

export function Volume({ value, ...props }: Omit<FinancialNumberProps, 'type'>) {
  return <FinancialNumber value={value} type="volume" compact {...props} />;
}

export function Currency({ value, currency = 'USD', ...props }: Omit<FinancialNumberProps, 'type'>) {
  return <FinancialNumber value={value} type="currency" currency={currency} {...props} />;
}