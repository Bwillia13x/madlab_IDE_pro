'use client';

import { RefreshCcw } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { useKpis, useDataCache } from '@/lib/data/hooks';

interface KpiCardProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}

function fmtMoney(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

// function pct(n: number) {
//   const s = (n * 100).toFixed(1) + '%';
//   return n >= 0 ? `+${s}` : s;
// }

// Simple sparkline component
function Sparkline({ data, color = '#7DC8F7' }: { data: number[]; color?: string }) {
  if (!data || data.length === 0) return <div className="w-full h-12 bg-card/30 rounded" />;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="w-full h-12 bg-gradient-to-r from-primary/10 to-accent/10 rounded border border-dashed border-border/30 p-1">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          className="opacity-90"
        />
      </svg>
    </div>
  );
}

export function KpiCard({ widget: _widget, symbol }: Readonly<KpiCardProps>) {
  const { data, loading, error } = useKpis(symbol);
  const { clearCache } = useDataCache();
  
  // Generate mock sparkline data
  const generateSparklineData = (base: number, volatility: number = 0.1) => {
    return Array.from({ length: 30 }, (_, i) => 
      base * (1 + (Math.random() - 0.5) * volatility + Math.sin(i / 5) * 0.05)
    );
  };

  return (
    <div className="h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">KPI — Revenue (TTM)</h4>
        <button
          type="button"
          onClick={() => clearCache()}
          title="Refresh"
          className="h-6 px-2 rounded text-xs text-muted-foreground hover:bg-muted/50 inline-flex items-center gap-1"
          data-testid="kpi-refresh"
        >
          <RefreshCcw className="h-3 w-3" /> Refresh
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold">
            {loading ? '…' : data ? fmtMoney(data.price * 1000000) : error ? 'ERR' : '$4.21B'}
          </div>
          <div className="px-2 py-1 bg-primary/20 text-primary text-xs rounded border">
            +6.2%
          </div>
        </div>
        
        <Sparkline 
          data={generateSparklineData(4.21, 0.15)} 
          color="hsl(var(--primary))" 
        />
      </div>
      
      <div className="border-t pt-3">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">KPI — EBIT Margin</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">17.8%</div>
            <div className="px-2 py-1 bg-accent/20 text-accent text-xs rounded border">
              +120 bps
            </div>
          </div>
          
          <Sparkline 
            data={generateSparklineData(17.8, 0.08)} 
            color="hsl(var(--accent))" 
          />
        </div>
      </div>
    </div>
  );
}

// TODO: Implement real KPI data integration
// - Connect to financial data APIs (Alpha Vantage, Yahoo Finance, Bloomberg)
// - Add configurable KPI metrics selection
// - Implement historical trend analysis
// - Add alert thresholds and notifications
// - Support for custom KPI calculations
// - Real-time data updates and WebSocket connections