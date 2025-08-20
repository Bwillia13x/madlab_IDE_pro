'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { usePrices } from '@/lib/data/hooks';
import { useWorkspaceStore } from '@/lib/store';
import { ResponsiveContainer, ComposedChart, Area, XAxis, Tooltip, YAxis, Line } from 'recharts';

interface CandlestickChartProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

export function CandlestickChart({ widget, sheetId: _sheetId, onTitleChange: _onTitleChange }: CandlestickChartProps) {
  const { globalSymbol, globalTimeframe } = useWorkspaceStore();
  const { data, loading, error } = usePrices(globalSymbol, globalTimeframe);
  const chartData = (data || []).map((p) => ({
    date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    close: p.close,
    low: p.low,
    high: p.high,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-2.5rem)]">
        {error ? (
          <div className="h-full flex items-center justify-center text-xs text-red-400">
            Failed to load prices: {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto","auto"]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#2d2d30', border: '1px solid #3e3e42', borderRadius: '4px', color: '#cccccc' }}
              />
              {/* High-Low range as area */}
              <Area dataKey="high" stroke="#999" fill="#999" opacity={0.1} isAnimationActive={!loading} />
              <Area dataKey={(d: any) => (d.high - d.low)} hide />
              <Line type="monotone" dataKey="close" stroke="#7DC8F7" dot={false} strokeWidth={2} isAnimationActive={!loading} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
