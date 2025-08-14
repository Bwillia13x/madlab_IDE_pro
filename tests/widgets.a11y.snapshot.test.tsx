import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VolCone } from '@/components/widgets/VolCone';
import { PnLProfile } from '@/components/widgets/PnLProfile';
import { BarChart } from '@/components/widgets/BarChart';
import { CorrelationMatrix } from '@/components/widgets/CorrelationMatrix';
import { Heatmap } from '@/components/widgets/Heatmap';
import { EnhancedLineChart } from '@/components/widgets/EnhancedLineChart';
import { CandlestickChart } from '@/components/widgets/CandlestickChart';
import { ChartLite, ChartLiteDefinition } from '@/components/widgets/ChartLite';
import { OptionsCard } from '@/components/widgets/OptionsCard';
import { GreeksSurface } from '@/components/widgets/GreeksSurface';
import { StrategyBuilder } from '@/components/widgets/StrategyBuilder';
import { StressScenarios } from '@/components/widgets/StressScenarios';
import { KPI, KPIDefinition } from '@/components/widgets/KPI';
import { DataTable, TableDefinition } from '@/components/widgets/Table';

// Provide minimal data/hooks so widgets relying on data don't crash
vi.mock('@/lib/data/hooks', () => ({
  usePrices: () => ({ data: [
    { date: new Date('2024-01-01'), close: 100 },
    { date: new Date('2024-01-02'), close: 101 },
    { date: new Date('2024-01-03'), close: 102 },
  ], loading: false, error: null }),
  useDataCache: () => ({ clearCache: () => {} }),
  useKpis: () => ({ data: {
    price: 123.45,
    change: 1.23,
    changePercent: 0.01,
    marketCap: 1_000_000,
    volume: 100_000,
    peRatio: 15.2,
    eps: 5.2,
    dividend: 1.2,
  }, loading: false, error: null }),
  useVolSurface: () => ({ data: {
    points: [
      { dte: 10, p90: 0.5, p75: 0.4, p50: 0.3, p25: 0.2, p10: 0.1, current: 0.25 },
      { dte: 20, p90: 0.45, p75: 0.36, p50: 0.28, p25: 0.18, p10: 0.09, current: 0.22 },
    ],
  } })
}));

const wrap = (el: React.ReactElement) => (
  <div style={{ width: 640, height: 360 }}>{el}</div>
);

const stubWidget = (id = 'w'): any => ({ id, type: id, title: id, layout: { i: id, x: 0, y: 0, w: 6, h: 4 } });

describe('Widget a11y/testids', () => {
  it('VolCone exposes role/img and testid', () => {
    render(wrap(<VolCone widget={stubWidget('vol')} symbol="AAPL" />));
    expect(screen.getByTestId('vol-cone')).toBeTruthy();
    expect(screen.getByRole('img', { name: /volatility cone/i })).toBeTruthy();
  });

  it('PnLProfile exposes role/img and testid', () => {
    render(wrap(<PnLProfile widget={stubWidget('pnl')} />));
    expect(screen.getByTestId('pnl-profile')).toBeTruthy();
    expect(screen.getByRole('img', { name: /p&l profile/i })).toBeTruthy();
  });

  it('BarChart exposes role/img and testid', () => {
    render(wrap(<BarChart widget={stubWidget('bar')} />));
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
    expect(screen.getByRole('img', { name: /peer multiples/i })).toBeTruthy();
  });

  it('CorrelationMatrix wrapped and labeled', () => {
    render(wrap(<CorrelationMatrix widget={stubWidget('corr')} />));
    expect(screen.getByTestId('correlation-matrix')).toBeTruthy();
    expect(screen.getByRole('img', { name: /correlation matrix/i })).toBeTruthy();
  });

  it('Heatmap wrapped and labeled', () => {
    render(wrap(<Heatmap widget={stubWidget('heat')} />));
    expect(screen.getByTestId('heatmap')).toBeTruthy();
    expect(screen.getByRole('img', { name: /sensitivity heatmap/i })).toBeTruthy();
  });

  it('EnhancedLineChart uses ChartContainer and labeled', () => {
    render(wrap(<EnhancedLineChart widget={stubWidget('elc')} symbol="AAPL" />));
    expect(screen.getByTestId('enhanced-line-chart')).toBeTruthy();
    expect(screen.getByRole('img', { name: /enhanced line chart/i })).toBeTruthy();
  });

  it('CandlestickChart uses ChartContainer and labeled', () => {
    render(wrap(<CandlestickChart widget={stubWidget('cndl')} symbol="AAPL" />));
    expect(screen.getByTestId('candlestick-chart')).toBeTruthy();
    expect(screen.getByRole('img', { name: /candlestick chart/i })).toBeTruthy();
  });

  it('ChartLite wrapped and labeled', () => {
    render(wrap(<ChartLite id="lite" config={ChartLiteDefinition.meta.defaultConfig} />));
    expect(screen.getByTestId('chart-lite')).toBeTruthy();
    expect(screen.getByRole('img', { name: /chart lite/i })).toBeTruthy();
  });

  it('OptionsCard wrapped and labeled', () => {
    render(wrap(<OptionsCard widget={stubWidget('opt')} symbol="AAPL" />));
    expect(screen.getByTestId('options-card')).toBeTruthy();
  });

  it('GreeksSurface wrapped and labeled', () => {
    render(wrap(<GreeksSurface widget={stubWidget('greeks')} />));
    expect(screen.getByTestId('greeks-surface')).toBeTruthy();
    expect(screen.getByRole('table', { name: /greeks/i })).toBeTruthy();
  });

  it('StrategyBuilder wrapped and labeled', () => {
    render(wrap(<StrategyBuilder widget={stubWidget('strat')} />));
    expect(screen.getByTestId('strategy-builder')).toBeTruthy();
  });

  it('StressScenarios wrapped and labeled', () => {
    render(wrap(<StressScenarios widget={stubWidget('stress')} />));
    expect(screen.getByTestId('stress-scenarios')).toBeTruthy();
  });

  it('KPI wrapped and exposes testids', () => {
    render(wrap(<KPI id="kpi" config={KPIDefinition.meta.defaultConfig} />));
    expect(screen.getByTestId('kpi')).toBeTruthy();
  });

  it('DataTable wrapped and labeled', () => {
    render(wrap(<DataTable id="tbl" config={TableDefinition.meta.defaultConfig} />));
    expect(screen.getByTestId('data-table')).toBeTruthy();
    expect(screen.getByRole('table', { name: /data table/i })).toBeTruthy();
  });
});


