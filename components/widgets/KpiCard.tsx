'use client';

import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

function pct(n: number) {
  const s = (n * 100).toFixed(1) + '%';
  return n >= 0 ? `+${s}` : s;
}

export function KpiCard({ widget: _widget, symbol }: Readonly<KpiCardProps>) {
  const { data, loading, error } = useKpis(symbol);
  const { clearCache } = useDataCache();

  return (
    <div className="h-full">
      <div className="grid grid-cols-2 gap-3 h-full">
        <div className="col-span-2 flex items-center justify-end -mb-1">
          <button
            type="button"
            onClick={() => clearCache()}
            title="Refresh"
            className="h-6 px-2 rounded text-xs text-[#cccccc] hover:bg-[#3e3e42] inline-flex items-center gap-1"
            data-testid="kpi-refresh"
          >
            <RefreshCcw className="h-3 w-3" /> Refresh
          </button>
        </div>
        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">Price</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {loading ? '…' : data ? fmtMoney(data.price) : error ? 'ERR' : '—'}
                </p>
              </div>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {(data?.changePercent ?? 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span
                className={`text-xs ${(data?.changePercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {data ? pct(data.changePercent) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">Market Cap</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {loading ? '…' : data ? fmtMoney(data.marketCap) : error ? 'ERR' : '—'}
                </p>
              </div>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {(data?.change ?? 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span
                className={`text-xs ${(data?.change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {data ? fmtMoney(data.change) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">Volume</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {loading ? '…' : data ? fmtMoney(data.volume) : error ? 'ERR' : '—'}
                </p>
              </div>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {data?.peRatio ? (
                <Activity className="h-3 w-3 text-blue-400" />
              ) : (
                <Activity className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-xs text-gray-400">P/E: {data?.peRatio?.toFixed(1) ?? '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">EPS</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {loading ? '…' : data?.eps ? `$${data.eps.toFixed(2)}` : error ? 'ERR' : '—'}
                </p>
              </div>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {data?.dividend ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <Activity className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-xs text-gray-400">
                Div: {data?.dividend ? `$${data.dividend.toFixed(2)}` : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
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

export default KpiCard;
