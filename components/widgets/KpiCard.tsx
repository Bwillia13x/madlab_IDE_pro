'use client';

import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';
import { Price, Percentage, Currency, Volume } from '@/components/ui/FinancialNumber';
import type { Widget } from '@/lib/store';
import { useKpis, useDataCache } from '@/lib/data/hooks';
import { exportKpiData } from '@/lib/data/export';

interface KpiCardProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}


export function KpiCard({ widget: _widget, symbol }: Readonly<KpiCardProps>) {
  const { data, loading, error } = useKpis(symbol);
  const { clearCache } = useDataCache();
  
  const actualSymbol = symbol || 'AAPL';

  const handleExport = () => {
    if (!data) {
      toast.error('No data available to export');
      return;
    }

    try {
      const exportData: Record<string, string | number> = {
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        marketCap: data.marketCap ?? 0,
        volume: data.volume,
        peRatio: data.peRatio || 0,
        eps: data.eps || 0,
        dividend: data.dividend || 0,
      };

      exportKpiData(exportData, actualSymbol);
      toast.success(`KPI data for ${actualSymbol} exported successfully`);
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const content = (
    <div className="h-full group" data-testid="kpi-card">
      <div className="grid grid-cols-2 gap-3 h-full">
        <div className="col-span-2 flex items-center justify-end -mb-1 gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={handleExport}
            title="Export Data"
            className="h-6 px-2 rounded text-xs text-muted-foreground hover:bg-accent inline-flex items-center gap-1"
            data-testid="kpi-export"
            disabled={!data || loading}
          >
            <Download className="h-3 w-3" /> Export
          </button>
          <button
            type="button"
            onClick={() => clearCache()}
            title="Refresh"
            className="h-6 px-2 rounded text-xs text-muted-foreground hover:bg-accent inline-flex items-center gap-1"
            data-testid="kpi-refresh"
          >
            <RefreshCcw className="h-3 w-3" /> Refresh
          </button>
        </div>
        {error && (
          <div className="col-span-2 -mt-2">
            <div className="text-xs text-red-400" role="status">{String(error)}</div>
          </div>
        )}

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <div className="kpi-value text-foreground">
                  {loading ? '…' : error ? 'ERR' : (
                    <Price value={data?.price} size="lg" />
                  )}
                </div>
              </div>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {(data?.changePercent ?? 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <Percentage 
                value={data?.changePercent} 
                size="sm"
                showSign
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                <div className="kpi-value text-foreground">
                  {loading ? '…' : error ? 'ERR' : (
                    <Currency value={data?.marketCap} size="lg" compact />
                  )}
                </div>
              </div>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {(data?.change ?? 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <Currency 
                value={data?.change} 
                size="sm"
                showSign
                compact
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Volume</p>
                <div className="text-lg font-semibold text-foreground">
                  {loading ? '…' : error ? 'ERR' : (
                    <Volume value={data?.volume} size="lg" />
                  )}
                </div>
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

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">EPS</p>
                <div className="text-lg font-semibold text-foreground">
                  {loading ? '…' : error ? 'ERR' : (
                    <Currency value={data?.eps} size="lg" precision={2} />
                  )}
                </div>
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

  return (
    <AccessibleWidget
      widgetType="kpi-card"
      title={`${actualSymbol} KPI`}
      loading={loading}
      error={error ?? null}
      helpText={`KPI summary for ${actualSymbol}.`}
      enableLiveUpdates
    >
      {content}
    </AccessibleWidget>
  );
}

export default KpiCard;

// Default export for dynamic loader compatibility
export function KpiCardDefault(props: { id?: string; config?: { title?: string; symbol?: string } }) {
  const stubWidget = {
    id: props?.id || 'kpi-card-stub',
    type: 'kpi-card',
    title: props?.config?.title || 'KPI',
    layout: { i: 'kpi-card-stub', x: 0, y: 0, w: 4, h: 3 },
  } as unknown as Widget;
  return <KpiCard widget={stubWidget} symbol={props?.config?.symbol || 'AAPL'} />;
}

// TODO: Implement real KPI data integration
// - Connect to financial data APIs (Alpha Vantage, Yahoo Finance, Bloomberg)
// - Add configurable KPI metrics selection
// - Implement historical trend analysis
// - Add alert thresholds and notifications
// - Support for custom KPI calculations
// - Real-time data updates and WebSocket connections
