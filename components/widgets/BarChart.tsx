'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Widget } from '@/lib/store';
import { exportToCSV, type ExportColumn } from '@/lib/data/export';

interface BarChartProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_BAR_DATA = [
  { name: 'ACME', value: 12.1, category: 'P/E' },
  { name: 'Beta', value: 14.8, category: 'P/E' },
  { name: 'Globex', value: 18.3, category: 'P/E' },
  { name: 'Delta', value: 9.7, category: 'P/E' },
  { name: 'Echo', value: 22.1, category: 'P/E' },
];

export function BarChart({ widget: _widget }: Readonly<BarChartProps>) {
  const handleExport = () => {
    try {
      const columns: ExportColumn[] = [
        { key: 'name', label: 'Company', format: 'text' },
        { key: 'value', label: 'P/E Ratio', format: 'number' },
        { key: 'category', label: 'Category', format: 'text' },
      ];
      
      exportToCSV(MOCK_BAR_DATA, columns, {
        filename: `pe_ratios_${new Date().toISOString().split('T')[0]}.csv`
      });
      toast.success('P/E ratio data exported successfully');
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-full flex flex-col group">
      <div className="flex justify-between items-center p-2 border-b">
        <span className="text-sm font-medium">P/E Ratios</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleExport}
          className="h-6 px-2 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
      <div className="flex-1 min-h-0" role="img" aria-label="Peer multiples bar chart" data-testid="bar-chart">
        <ChartContainer minHeight={200}>
        <RechartsBarChart data={MOCK_BAR_DATA}>
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
              color: 'hsl(var(--foreground))'
            }}
          />
          <Bar 
            dataKey="value" 
            fill="hsl(var(--primary))"
            radius={[2, 2, 0, 0]}
          />
        </RechartsBarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

// Default export for dynamic loader compatibility
export default function BarChartDefault(_props: unknown) {
  return <BarChart widget={{ id: 'bar', type: 'bar-chart', title: 'Peer Multiples', layout: { i: 'bar', x: 0, y: 0, w: 6, h: 4 } } as any} />;
}

// TODO: Advanced bar chart features
// - Grouped and stacked bar charts
// - Horizontal bar charts
// - Custom color schemes and themes
// - Data labels and annotations
// - Drill-down capabilities
// - Comparison benchmarks