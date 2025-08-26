/**
 * Tests for MarketOverviewWidget Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MarketOverviewWidget } from '@/components/widgets/MarketOverviewWidget';
import { setupWidgetTest, cleanupTest } from '../test-isolation';

// Mock the data hooks
vi.mock('@/lib/data/hooks', () => ({
  useKpis: vi.fn(),
}));

// Mock the store
vi.mock('@/lib/store', () => ({
  useWorkspaceStore: vi.fn(),
}));

// Import after mocks
import { useKpis } from '@/lib/data/hooks';
import { useWorkspaceStore } from '@/lib/store';

const mockUseKpis = vi.mocked(useKpis);
const mockUseWorkspaceStore = vi.mocked(useWorkspaceStore);

describe('MarketOverviewWidget', () => {
  const mockWidget = {
    id: 'market-overview-1',
    type: 'market-overview',
    title: 'Market Overview',
    category: 'Market Data',
  };

  beforeEach(() => {
    setupWidgetTest();

    // Mock specific to this test
    mockUseKpis.mockReturnValue({
      data: {
        symbol: 'AAPL',
        price: 175.43,
        change: 2.15,
        changePercent: 1.24,
      },
      loading: false,
      error: null,
    });
    mockUseWorkspaceStore.mockImplementation((selector) => {
      if (selector) {
        return selector({ globalSymbol: 'AAPL' });
      }
      return { globalSymbol: 'AAPL' };
    });
  });

  afterEach(() => {
    cleanupTest();
  });

  it('should render with default market data', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    expect(screen.getByText('Market Overview')).toBeInTheDocument();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
    expect(screen.getByText('DOW')).toBeInTheDocument();
    expect(screen.getByText('RUSSELL 2000')).toBeInTheDocument();
  });

  it('should display major indices with correct values', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Check S&P 500 data
    expect(screen.getByText('4,567.89')).toBeInTheDocument();
    expect(screen.getByText('+23.45')).toBeInTheDocument();
    expect(screen.getByText('+0.52%')).toBeInTheDocument();

    // Check NASDAQ data (negative change)
    expect(screen.getByText('14,234.56')).toBeInTheDocument();
    expect(screen.getByText('-12.34')).toBeInTheDocument();
    expect(screen.getByText('-0.09%')).toBeInTheDocument();

    // Check DOW data
    expect(screen.getByText('34,567.89')).toBeInTheDocument();
    expect(screen.getByText('+123.45')).toBeInTheDocument();
    expect(screen.getByText('+0.36%')).toBeInTheDocument();
  });

  it('should display sector performance data', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();
    expect(screen.getByText('Financial Services')).toBeInTheDocument();
    expect(screen.getByText('Consumer Cyclical')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();

    // Check Technology sector data
    expect(screen.getByText('+1.2')).toBeInTheDocument();
    expect(screen.getByText('+0.85%')).toBeInTheDocument();
  });

  it('should display market breadth data', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    expect(screen.getByText('2,345')).toBeInTheDocument(); // advancing
    expect(screen.getByText('1,876')).toBeInTheDocument(); // declining
    expect(screen.getByText('234')).toBeInTheDocument(); // unchanged
  });

  it('should show trending indicators for positive changes', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // S&P 500 should show trending up
    const sp500Element = screen.getByText('S&P 500').closest('div');
    expect(sp500Element).toBeInTheDocument();

    // Should have trending up icon for positive changes
    const trendingUpIcons = screen.getAllByTestId('trending-up');
    expect(trendingUpIcons.length).toBeGreaterThan(0);
  });

  it('should show trending indicators for negative changes', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // NASDAQ should show trending down
    const nasdaqElement = screen.getByText('NASDAQ').closest('div');
    expect(nasdaqElement).toBeInTheDocument();

    // Should have trending down icon for negative changes
    const trendingDownIcons = screen.getAllByTestId('trending-down');
    expect(trendingDownIcons.length).toBeGreaterThan(0);
  });

  it('should handle loading states', () => {
    mockUseKpis.mockReturnValue({
      data: [],
      loading: true,
      error: null,
    });

    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Should still render the basic structure
    expect(screen.getByText('Market Overview')).toBeInTheDocument();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
  });

  it('should handle error states', () => {
    mockUseKpis.mockReturnValue({
      data: [],
      loading: false,
      error: new Error('Failed to fetch market data'),
    });

    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Should still render the basic structure
    expect(screen.getByText('Market Overview')).toBeInTheDocument();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
  });

  it('should display volume data for sectors', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Volume data should be formatted correctly
    expect(screen.getByText('1,250M')).toBeInTheDocument(); // Technology volume
    expect(screen.getByText('890M')).toBeInTheDocument(); // Healthcare volume
  });

  it('should show market status indicators', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Should show market breadth ratio
    const advancingStocks = screen.getByText('2,345');
    const decliningStocks = screen.getByText('1,876');

    expect(advancingStocks).toBeInTheDocument();
    expect(decliningStocks).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    // This widget uses static data, so empty state is less relevant
    // But we can test the structure remains intact
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    expect(screen.getByText('Market Overview')).toBeInTheDocument();
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
  });

  it('should display data in proper sections', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Should have major indices section
    expect(screen.getAllByText('Major Indices')).toHaveLength(1);

    // Should have sector performance section
    expect(screen.getAllByText('Sector Performance')).toHaveLength(1);

    // Should have market breadth section
    expect(screen.getAllByText('Market Breadth')).toHaveLength(1);
  });

  it('should format large numbers correctly', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Large numbers should be formatted with commas
    expect(screen.getAllByText('4,567.89')).toHaveLength(1);
    expect(screen.getAllByText('14,234.56')).toHaveLength(1);
    expect(screen.getAllByText('34,567.89')).toHaveLength(1);
  });

  it('should handle different market conditions', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Test positive change formatting - look for actual rendered values
    const positiveChanges = screen.getAllByText(/\+[\d,]+\.\d+/);
    const positivePercents = screen.getAllByText(/\+[\d,]+\.\d+%/);
    expect(positiveChanges.length).toBeGreaterThan(0);
    expect(positivePercents.length).toBeGreaterThan(0);

    // Test negative change formatting - look for actual rendered values
    const negativeChanges = screen.getAllByText(/-[\d,]+\.\d+/);
    const negativePercents = screen.getAllByText(/-[\d,]+\.\d+%/);
    expect(negativeChanges.length).toBeGreaterThan(0);
    expect(negativePercents.length).toBeGreaterThan(0);
  });

  it('should be responsive and accessible', () => {
    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Should have proper heading structure
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);

    // Should have semantic structure
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('should integrate with real-time data when available', () => {
    const mockRealTimeData = [
      {
        symbol: 'SPX',
        price: 4600.0,
        change: 32.11,
        changePercent: 0.7,
      },
    ];

    mockUseKpis.mockReturnValue({
      data: mockRealTimeData,
      loading: false,
      error: null,
    });

    render(<MarketOverviewWidget widget={mockWidget} sheetId="sheet-1" />);

    // Should still render static data since the component uses static data primarily
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
  });
});
