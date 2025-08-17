'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Widget } from '@/lib/store';
import { useQuarterlyFinancials } from '@/lib/data/hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface IncomeStatementBreakdownProps {
  widget: Widget;
  sheetId: string;
}

export function IncomeStatementBreakdown({ widget }: Readonly<IncomeStatementBreakdownProps>) {
  const symbol = (widget.props?.symbol as string) || 'AAPL';
  const { data, loading, error } = useQuarterlyFinancials(symbol, 4);

  // Transform data for stacked bar chart
  const chartData = data.map((row) => ({
    period: row.period,
    revenue: row.revenue,
    cogs: row.revenue * 0.65, // Mock COGS at 65% of revenue
    grossProfit: row.revenue * 0.35,
    operatingExpenses: row.revenue * 0.15, // Mock OpEx at 15% of revenue
    operatingIncome: row.revenue * 0.20,
    netIncome: row.netIncome,
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Income Statement Breakdown — {symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading breakdown…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis dataKey="period" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={formatCurrency} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelFormatter={(label) => `Quarter: ${label}`}
                />
                <Legend fontSize={10} />
                <Bar dataKey="revenue" stackId="a" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="cogs" stackId="a" fill="#ef4444" name="COGS" />
                <Bar dataKey="grossProfit" stackId="a" fill="#10b981" name="Gross Profit" />
                <Bar dataKey="operatingExpenses" stackId="a" fill="#f59e0b" name="OpEx" />
                <Bar dataKey="operatingIncome" stackId="a" fill="#8b5cf6" name="Op Income" />
                <Bar dataKey="netIncome" stackId="a" fill="#06b6d4" name="Net Income" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="text-xs text-muted-foreground">
              Mock breakdown: COGS 65%, OpEx 15%, derived from quarterly data
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
