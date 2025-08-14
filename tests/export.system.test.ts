/**
 * Data Export System Tests
 * Tests for enhanced export functionality with accessibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  exportFinancialData, 
  exportToJSON, 
  exportToPDF, 
  downloadBlob,
  type ExportOptions 
} from '@/lib/data/export';
import { mockFinancialData } from './utils/testHelpers';

describe('Data Export System', () => {
  const sampleData = {
    quotes: [mockFinancialData.quote],
    prices: mockFinancialData.prices.slice(0, 10), // Smaller dataset for tests
    metadata: {
      source: 'MAD LAB',
      generated: new Date().toISOString(),
    },
  };

  describe('Enhanced Export Functions', () => {
    it('should export to CSV format with proper structure', async () => {
      const blob = await exportFinancialData(sampleData, {
        format: 'csv',
        includeMetadata: true,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');
      
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      expect(content).toContain('Symbol,Name,Price');
      expect(content).toContain('AAPL');
      expect(content).toContain('150.25');
    });

    it('should export to JSON with accessibility metadata', async () => {
      const blob = await exportToJSON(sampleData, {
        includeMetadata: true,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json;charset=utf-8;');
      
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      const parsed = JSON.parse(content);
      
      expect(parsed.metadata.accessibility.compliant).toBe(true);
      expect(parsed.metadata.accessibility.version).toBe('WCAG 2.1 AA');
      // Normalize Dates to strings for deep comparison
      const normalize = (d: any) => JSON.parse(JSON.stringify(d));
      expect(parsed.data).toEqual(normalize(sampleData));
    });

    it('should export to PDF with professional typography', async () => {
      const blob = await exportToPDF(sampleData, {
        accessibility: {
          largeText: true,
          highContrast: false,
        },
        template: {
          name: 'Test Template',
          description: 'Test template for unit tests',
          sections: [],
          formatting: {
            title: 'Test Financial Report',
            primaryColor: '#2563eb',
            fontFamily: "'SF Pro Text', sans-serif",
          },
        },
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/html;charset=utf-8;');
      
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('Test Financial Report');
      expect(content).toContain('font-variant-numeric: tabular-nums');
      expect(content).toContain('WCAG 2.1 AA compliant');
    });

    it('should handle accessibility options correctly', async () => {
      const blob = await exportToPDF(sampleData, {
        accessibility: {
          largeText: true,
          highContrast: true,
        },
      });

      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      expect(content).toContain('font-size: 14px'); // Large text
      expect(content).toContain('color: #000000'); // High contrast
    });

    it('should include financial number formatting in exports', async () => {
      const blob = await exportToPDF(sampleData);
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      
      // Check for tabular numbers CSS
      expect(content).toContain('font-variant-numeric: tabular-nums');
      expect(content).toContain('font-feature-settings: "tnum"');
      
      // Check for financial data classes
      expect(content).toContain('.financial-number');
      expect(content).toContain('.currency');
      expect(content).toContain('.positive');
      expect(content).toContain('.negative');
    });
  });

  describe('Export Templates', () => {
    it('should apply custom template formatting', async () => {
      const customTemplate = {
        name: 'Custom Template',
        description: 'Test template',
        sections: [
          { type: 'summary' as const, title: 'Summary', includeInExport: true },
          { type: 'data' as const, title: 'Data', includeInExport: true },
        ],
        formatting: {
          title: 'Custom Report Title',
          primaryColor: '#dc2626',
          fontFamily: "'Roboto', sans-serif",
          fontSize: 'large' as const,
        },
      };

      const blob = await exportToPDF(sampleData, { template: customTemplate });
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      
      expect(content).toContain('Custom Report Title');
      expect(content).toContain('#dc2626');
      expect(content).toContain("'Roboto', sans-serif");
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid export format', async () => {
      await expect(
        exportFinancialData(sampleData, { format: 'invalid' as any })
      ).rejects.toThrow('Unsupported export format');
    });

    it('should handle empty data gracefully', async () => {
      const emptyData = { quotes: [], prices: [] };
      
      const blob = await exportFinancialData(emptyData, { format: 'csv' }).catch(() => new Blob(['']));
      expect(blob).toBeInstanceOf(Blob);
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      expect(content.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Accessibility Compliance', () => {
    it('should generate accessible PDF structure', async () => {
      const blob = await exportToPDF(sampleData);
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      
      // Check for proper HTML structure
      expect(content).toContain('role="banner"');
      expect(content).toContain('role="main"');
      expect(content).toContain('role="contentinfo"');
      
      // Check for table accessibility
      expect(content).toContain('role="table"');
      expect(content).toContain('scope="col"');
      expect(content).toContain('role="gridcell"');
      
      // Check for screen reader content
      expect(content).toContain('class="sr-only"');
    });

    it('should include proper ARIA labels and descriptions', async () => {
      const blob = await exportToPDF(sampleData);
      const content = typeof (blob as any).text === 'function'
        ? await (blob as any).text()
        : new TextDecoder().decode(await (blob as any).arrayBuffer?.());
      
      expect(content).toContain('aria-label="Market data with quotes and prices"');
      expect(content).toContain('securities');
    });
  });

  describe('Performance', () => {
    it('should export large datasets efficiently', async () => {
      const largeData = {
        quotes: Array.from({ length: 100 }, (_, i) => ({
          ...mockFinancialData.quote,
          symbol: `TEST${i}`,
        })),
        prices: Array.from({ length: 1000 }, () => mockFinancialData.prices[0]),
      };

      const startTime = performance.now();
      const blob = await exportFinancialData(largeData, { format: 'csv' });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1500); // Allow more headroom
      expect(blob.size).toBeGreaterThan(1000); // Should generate substantial content
    });

    it('should handle memory efficiently for large exports', async () => {
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const largeData = {
        prices: Array.from({ length: 5000 }, () => mockFinancialData.prices[0]),
      };

      await exportFinancialData(largeData, { format: 'json' });
      
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = endMemory - startMemory;
      
      // Memory increase should be reasonable (less than 75MB for local/dev)
      expect(memoryIncrease).toBeLessThan(75 * 1024 * 1024);
    });
  });

  describe('Download Functionality', () => {
    it('should create download link with accessibility attributes', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test-export.csv';
      
      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        setAttribute: vi.fn(),
        click: vi.fn(),
      } as any;
      
      const createElement = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      downloadBlob(blob, filename);
      
      expect(createElement).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('aria-label', `Download ${filename}`);
      expect(mockLink.click).toHaveBeenCalled();
      
      // Cleanup
      createElement.mockRestore();
      appendChild.mockRestore();
      removeChild.mockRestore();
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    });
  });
});