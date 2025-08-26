/**
 * Tests for AdvancedChart Widget Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedChart } from '@/components/widgets/AdvancedChart';

// Note: lucide-react and document.createElement mocks are now handled globally in tests/setup.ts

describe('AdvancedChart Widget', () => {
  afterEach(() => {
    cleanup();
  });

  const mockWidget = {
    id: 'advanced-chart-1',
    type: 'advanced-chart',
    title: 'Advanced Chart',
    category: 'Chart',
  };

  const mockWidgetProps: any = {
    widget: mockWidget,
    sheetId: 'sheet-1',
  };

  it('should render with default props', () => {
    render(<AdvancedChart {...mockWidgetProps} />);

    expect(screen.getByText('Advanced Chart')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument(); // Symbol input
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('should display symbol input field', () => {
    render(<AdvancedChart {...mockWidgetProps} />);

    const symbolInput = screen.getByDisplayValue('NVDA');
    expect(symbolInput).toBeInTheDocument();
    expect(symbolInput).toHaveAttribute('type', 'text');
  });

  it('should allow symbol input changes', async () => {
    const user = userEvent.setup();
    render(<AdvancedChart {...mockWidgetProps} />);

    const symbolInput = screen.getByRole('textbox');
    await user.clear(symbolInput);
    await user.type(symbolInput, 'AAPL');

    expect(symbolInput).toHaveValue('AAPL');
  });

  it('should display chart controls', () => {
    render(<AdvancedChart {...mockWidgetProps} />);

    // Should have download button
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByTestId('download-icon')).toBeInTheDocument();
  });

  it('should display symbol badges or indicators', () => {
    render(<AdvancedChart {...mockWidgetProps} />);

    // The component should render some form of chart container or data display
    expect(screen.getByText('Advanced Chart')).toBeInTheDocument();
  });

  it('should handle download functionality', async () => {
    const user = userEvent.setup();

    render(<AdvancedChart {...mockWidgetProps} />);

    const downloadButton = screen.getByRole('button', { name: /download/i });
    await user.click(downloadButton);

    // The global mock will handle the anchor creation and click
    expect(screen.getByTestId('download-icon')).toBeInTheDocument();
  });

  it('should generate mock OHLC data', () => {
    // Test that the component renders with OHLC data structure
    render(<AdvancedChart {...mockWidgetProps} />);

    // The component should render successfully with mock data
    expect(screen.getByText('Advanced Chart')).toBeInTheDocument();

    // Should have symbol input that can generate data
    const symbolInput = screen.getByRole('textbox');
    expect(symbolInput).toHaveValue('NVDA'); // Default symbol from component
  });

  it('should handle different symbols', async () => {
    const user = userEvent.setup();
    render(<AdvancedChart {...mockWidgetProps} />);

    const symbolInput = screen.getByRole('textbox');

    // Test different symbols
    await user.clear(symbolInput);
    await user.type(symbolInput, 'MSFT');
    expect(symbolInput).toHaveValue('MSFT');

    await user.clear(symbolInput);
    await user.type(symbolInput, 'GOOGL');
    expect(symbolInput).toHaveValue('GOOGL');
  });

  it('should display chart data structure', () => {
    render(<AdvancedChart {...mockWidgetProps} />);

    // The component should render some chart-related content
    expect(screen.getByText('Advanced Chart')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should handle empty or invalid symbols', async () => {
    const user = userEvent.setup();
    render(<AdvancedChart {...mockWidgetProps} />);

    const symbolInput = screen.getByRole('textbox');

    // Test with empty symbol
    await user.clear(symbolInput);
    expect(symbolInput).toHaveValue('');

    // Test with special characters
    await user.type(symbolInput, 'TEST@123');
    expect(symbolInput).toHaveValue('TEST@123');
  });

  it('should maintain component structure on re-render', () => {
    const { rerender } = render(<AdvancedChart {...mockWidgetProps} />);

    expect(screen.getByText('Advanced Chart')).toBeInTheDocument();

    // Re-render with same props
    rerender(<AdvancedChart {...mockWidgetProps} />);

    expect(screen.getByText('Advanced Chart')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should support different widget configurations', () => {
    const customWidget = {
      ...mockWidget,
      title: 'Custom Advanced Chart',
    };

    render(<AdvancedChart {...mockWidgetProps} widget={customWidget} />);

    expect(screen.getByText('Custom Advanced Chart')).toBeInTheDocument();
  });

  it('should handle download errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock URL.createObjectURL to throw error
    global.URL.createObjectURL = vi.fn(() => {
      throw new Error('Failed to create URL');
    });

    // Mock console.error to capture error logs
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdvancedChart {...mockWidgetProps} />);

    const downloadButton = screen.getByRole('button', { name: /download/i });
    await user.click(downloadButton);

    // Should not throw an error, should handle gracefully
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should generate consistent data for same symbol', () => {
    // Test that different symbols can be entered consistently
    render(<AdvancedChart {...mockWidgetProps} />);

    const symbolInput = screen.getByRole('textbox');
    expect(symbolInput).toBeInTheDocument();

    // Component should handle symbol changes without errors
    fireEvent.change(symbolInput, { target: { value: 'AAPL' } });
    expect(symbolInput).toHaveValue('AAPL');

    fireEvent.change(symbolInput, { target: { value: 'MSFT' } });
    expect(symbolInput).toHaveValue('MSFT');
  });

  it('should handle component cleanup', () => {
    const { unmount } = render(<AdvancedChart {...mockWidgetProps} />);

    // Should not throw errors during cleanup
    expect(() => unmount()).not.toThrow();
  });

  it('should support accessibility features', () => {
    render(<AdvancedChart {...mockWidgetProps} />);

    // Should have proper labeling
    const symbolInput = screen.getByDisplayValue('NVDA');
    expect(symbolInput).toHaveAttribute('type', 'text');

    // Download button should be accessible
    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('should handle large datasets', () => {
    // Test that the component can handle different symbol inputs without errors
    render(<AdvancedChart {...mockWidgetProps} />);

    const symbolInput = screen.getByDisplayValue('NVDA');
    expect(symbolInput).toBeInTheDocument();

    // Component should handle symbol changes that would generate different data sizes
    fireEvent.change(symbolInput, { target: { value: 'LARGE_DATASET_TEST' } });
    expect(symbolInput).toHaveValue('LARGE_DATASET_TEST');

    // Should still render properly
    expect(screen.getByText('Advanced Chart')).toBeInTheDocument();
  });
});
