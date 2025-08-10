'use client';

import { AlertCircle, TrendingDown } from 'lucide-react';
import type { Widget } from '@/lib/store';

interface StressScenariosProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_STRESS_DATA = [
  { scenario: '2008 Crisis', impact: '-18.7%', color: 'text-red-400' },
  { scenario: 'Covid Crash', impact: '-12.3%', color: 'text-red-400' },
  { scenario: 'Tech Bubble', impact: '-8.9%', color: 'text-orange-400' },
  { scenario: 'Rate Spike', impact: '-6.2%', color: 'text-yellow-400' },
];

export function StressScenarios({ widget: _widget }: Readonly<StressScenariosProps>) {
  return (
    <div className="h-full space-y-2">
      {MOCK_STRESS_DATA.map((scenario, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-[#2d2d30] rounded">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#969696]" />
            <span className="text-sm text-[#cccccc]">{scenario.scenario}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-400" />
            <span className={`text-sm font-medium ${scenario.color}`}>
              {scenario.impact}
            </span>
          </div>
        </div>
      ))}
      
      <div className="mt-4 p-3 bg-[#2d2d30] rounded">
        <div className="text-center">
          <p className="text-xs text-[#969696] mb-1">Worst Case (99%)</p>
          <p className="text-lg font-semibold text-red-400">-22.4%</p>
          <p className="text-xs text-[#969696]">Estimated Loss: $28.1M</p>
        </div>
      </div>
    </div>
  );
}

// TODO: Advanced stress testing features
// - Custom scenario builder
// - Historical scenario replay
// - Monte Carlo stress testing
// - Multi-factor stress scenarios
// - Regulatory stress test compliance
// - Scenario correlation analysis