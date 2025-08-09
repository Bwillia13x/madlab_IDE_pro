'use client';

import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Widget } from '@/lib/store';

interface KpiCardProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_KPI_DATA = {
  revenue: { value: '$48.5M', change: '+12.3%', trend: 'up' },
  netIncome: { value: '4.2M', change: '+8.7%', trend: 'up' },
  cashFlow: { value: '$59M', change: '-2.1%', trend: 'down' },
  fcf: { value: '$6.0M', change: '+15.2%', trend: 'up' }
};

export function KpiCard({ widget }: KpiCardProps) {
  return (
    <div className="h-full">
      <div className="grid grid-cols-2 gap-3 h-full">
        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">Revenue</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {MOCK_KPI_DATA.revenue.value}
                </p>
              </div>
              <DollarSign className="h-4 w-4 text-[#007acc]" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">{MOCK_KPI_DATA.revenue.change}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">Net Income</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {MOCK_KPI_DATA.netIncome.value}
                </p>
              </div>
              <Activity className="h-4 w-4 text-[#007acc]" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">{MOCK_KPI_DATA.netIncome.change}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">Cash Flow</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {MOCK_KPI_DATA.cashFlow.value}
                </p>
              </div>
              <DollarSign className="h-4 w-4 text-[#007acc]" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingDown className="h-3 w-3 text-red-400" />
              <span className="text-xs text-red-400">{MOCK_KPI_DATA.cashFlow.change}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2d2d30] border-[#3e3e42]">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#969696] mb-1">FCF</p>
                <p className="text-lg font-semibold text-[#cccccc]">
                  {MOCK_KPI_DATA.fcf.value}
                </p>
              </div>
              <Activity className="h-4 w-4 text-[#007acc]" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">{MOCK_KPI_DATA.fcf.change}</span>
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