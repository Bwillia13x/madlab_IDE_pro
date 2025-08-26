/**
 * Visual Regression Masking Utilities
 * Utilities for masking dynamic content, sensitive data, and animations
 */

import { Page } from '@playwright/test';
import { MaskConfig } from '../visual-regression.config';

export interface MaskingOptions {
  blur?: number;
  color?: string;
  opacity?: number;
  replaceWith?: string;
}

/**
 * Apply visual masks to dynamic or sensitive content
 */
export class VisualRegressionMasker {
  constructor(private page: Page) {}

  /**
   * Apply a single mask to the page
   */
  async applyMask(config: MaskConfig, options: MaskingOptions = {}): Promise<void> {
    const { selector, description } = config;
    const { blur = 0, color = '#000000', opacity = 1, replaceWith } = options;

    try {
      // Check if element exists
      const element = await this.page.locator(selector).first();
      const count = await element.count();

      if (count === 0) {
        console.warn(`Masking element not found: ${selector} (${description})`);
        return;
      }

      // Apply the mask
      if (replaceWith) {
        // Replace content with static text
        await element.evaluate((el, text) => {
          el.textContent = text;
        }, replaceWith);
      } else {
        // Apply visual mask
        await this.page.addStyleTag({
          content: `
            ${selector} {
              filter: blur(${blur}px) !important;
              background: ${color} !important;
              color: ${color} !important;
              opacity: ${opacity} !important;
              user-select: none !important;
              pointer-events: none !important;
            }
            ${selector} * {
              background: ${color} !important;
              color: ${color} !important;
              border-color: ${color} !important;
            }
          `,
        });
      }

      console.log(`Applied mask: ${description} (${selector})`);
    } catch (error) {
      console.error(`Failed to apply mask ${selector}:`, error);
    }
  }

  /**
   * Apply multiple masks at once
   */
  async applyMasks(configs: MaskConfig[], options: MaskingOptions = {}): Promise<void> {
    for (const config of configs) {
      await this.applyMask(config, options);
    }
  }

  /**
   * Mask common dynamic content patterns
   */
  async maskCommonDynamicContent(): Promise<void> {
    const commonMasks: MaskConfig[] = [
      {
        selector: '[data-testid*="timestamp"]',
        description: 'Timestamps',
        reason: 'Timestamps change frequently',
      },
      {
        selector: '[data-testid*="time"]',
        description: 'Time elements',
        reason: 'Time displays change frequently',
      },
      {
        selector: '[data-testid*="random"]',
        description: 'Random values',
        reason: 'Random data causes false positives',
      },
      {
        selector: '.timestamp',
        description: 'Timestamp classes',
        reason: 'Timestamp elements',
      },
      {
        selector: '.time-ago',
        description: 'Relative time',
        reason: 'Relative time changes',
      },
      {
        selector: '[data-testid*="session"]',
        description: 'Session IDs',
        reason: 'Session identifiers change',
      },
      {
        selector: '[data-testid*="uuid"]',
        description: 'UUIDs',
        reason: 'UUIDs are unique per session',
      },
    ];

    await this.applyMasks(commonMasks, { color: '#64748b', opacity: 0.8 });
  }

  /**
   * Mask sensitive information
   */
  async maskSensitiveContent(): Promise<void> {
    const sensitiveMasks: MaskConfig[] = [
      {
        selector: '[data-testid*="password"]',
        description: 'Password fields',
        reason: 'Security sensitive',
      },
      {
        selector: '[data-testid*="secret"]',
        description: 'Secret data',
        reason: 'Security sensitive',
      },
      {
        selector: '[data-testid*="api-key"]',
        description: 'API keys',
        reason: 'Security sensitive',
      },
      {
        selector: '[data-testid*="token"]',
        description: 'Auth tokens',
        reason: 'Security sensitive',
      },
      {
        selector: 'input[type="password"]',
        description: 'Password inputs',
        reason: 'Security sensitive',
      },
    ];

    await this.applyMasks(sensitiveMasks, { replaceWith: '••••••••' });
  }

  /**
   * Mask animated content that may cause inconsistent screenshots
   */
  async maskAnimatedContent(): Promise<void> {
    const animationMasks: MaskConfig[] = [
      {
        selector: '[data-testid*="loading"]',
        description: 'Loading indicators',
        reason: 'Animations cause inconsistent screenshots',
      },
      {
        selector: '[data-testid*="spinner"]',
        description: 'Spinners',
        reason: 'Animations cause inconsistent screenshots',
      },
      {
        selector: '.animate-pulse',
        description: 'Pulse animations',
        reason: 'Animations cause visual differences',
      },
      {
        selector: '.animate-spin',
        description: 'Spin animations',
        reason: 'Animations cause visual differences',
      },
      {
        selector: '.animate-bounce',
        description: 'Bounce animations',
        reason: 'Animations cause visual differences',
      },
      {
        selector: '[data-testid*="progress"]',
        description: 'Progress bars',
        reason: 'Progress may show different states',
      },
    ];

    // Stop animations and mask the elements
    await this.page.addStyleTag({
      content: `
        .animate-pulse,
        .animate-spin,
        .animate-bounce,
        [data-testid*="loading"],
        [data-testid*="spinner"],
        [data-testid*="progress"] {
          animation: none !important;
          transition: none !important;
          transform: none !important;
        }
      `,
    });

    await this.applyMasks(animationMasks, { blur: 1, opacity: 0.7 });
  }

  /**
   * Mask chart-specific dynamic content
   */
  async maskChartContent(): Promise<void> {
    const chartMasks: MaskConfig[] = [
      {
        selector: '.chart-tooltip',
        description: 'Chart tooltips',
        reason: 'Tooltips appear on hover and may be in different positions',
      },
      {
        selector: '[data-testid*="tooltip"]',
        description: 'Tooltips',
        reason: 'Tooltips may appear in different positions',
      },
      {
        selector: '.chart-legend-item',
        description: 'Chart legend items',
        reason: 'Legend items may have dynamic states',
      },
      {
        selector: '[data-testid*="legend"]',
        description: 'Legend elements',
        reason: 'Legend states may vary',
      },
      {
        selector: '.chart-random-value',
        description: 'Random chart values',
        reason: 'Random chart data causes false positives',
      },
    ];

    await this.applyMasks(chartMasks, { color: '#1e293b', opacity: 0.9 });
  }

  /**
   * Apply all recommended masks for comprehensive visual regression testing
   */
  async applyAllMasks(): Promise<void> {
    console.log('Applying comprehensive visual regression masks...');

    // Disable animations globally
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    // Apply all mask categories
    await Promise.all([
      this.maskCommonDynamicContent(),
      this.maskSensitiveContent(),
      this.maskAnimatedContent(),
      this.maskChartContent(),
    ]);

    // Wait for any async operations to complete
    await this.page.waitForTimeout(100);

    console.log('All visual regression masks applied');
  }

  /**
   * Remove all masks (useful for cleanup)
   */
  async removeAllMasks(): Promise<void> {
    // Reload the page to remove all style modifications
    await this.page.reload();
  }

  /**
   * Take a masked screenshot
   */
  async takeMaskedScreenshot(options: {
    selector?: string;
    masks?: MaskConfig[];
    maskingOptions?: MaskingOptions;
    screenshotOptions?: any;
  } = {}): Promise<Buffer> {
    const {
      selector,
      masks = [],
      maskingOptions = {},
      screenshotOptions = {},
    } = options;

    // Apply masks
    if (masks.length > 0) {
      await this.applyMasks(masks, maskingOptions);
    }

    // Wait for any visual changes to settle
    await this.page.waitForTimeout(200);

    // Take screenshot
    if (selector) {
      return await this.page.locator(selector).screenshot(screenshotOptions);
    }

    return await this.page.screenshot(screenshotOptions);
  }
}

/**
 * Utility function to create a masker instance
 */
export function createMasker(page: Page): VisualRegressionMasker {
  return new VisualRegressionMasker(page);
}

/**
 * Predefined mask configurations for common scenarios
 */
export const predefinedMasks = {
  // For dashboard screenshots
  dashboard: [
    {
      selector: '[data-testid*="timestamp"]',
      description: 'Dashboard timestamps',
      reason: 'Timestamps update frequently',
    },
    {
      selector: '.live-indicator',
      description: 'Live data indicators',
      reason: 'Live indicators may blink',
    },
    {
      selector: '.dashboard-updated-time',
      description: 'Last updated time',
      reason: 'Update times change frequently',
    },
  ],

  // For form screenshots
  forms: [
    {
      selector: 'input[type="password"]',
      description: 'Password fields',
      reason: 'Security sensitive',
    },
    {
      selector: '[data-testid*="password"]',
      description: 'Password test IDs',
      reason: 'Security sensitive',
    },
  ],

  // For chart screenshots
  charts: [
    {
      selector: '.chart-tooltip',
      description: 'Chart tooltips',
      reason: 'Tooltips appear on hover',
    },
    {
      selector: '[data-testid*="tooltip"]',
      description: 'Tooltip elements',
      reason: 'Tooltips may be in different positions',
    },
    {
      selector: '.chart-random-data',
      description: 'Random chart data',
      reason: 'Random data causes false positives',
    },
  ],

  // For general UI screenshots
  ui: [
    {
      selector: '[data-testid*="loading"]',
      description: 'Loading states',
      reason: 'Loading states may vary',
    },
    {
      selector: '[data-testid*="spinner"]',
      description: 'Spinners',
      reason: 'Spinners are animated',
    },
  ],
};

/**
 * Quick masking functions for common scenarios
 */
export async function maskForDashboard(page: Page): Promise<void> {
  const masker = createMasker(page);
  await masker.applyMasks(predefinedMasks.dashboard);
}

export async function maskForCharts(page: Page): Promise<void> {
  const masker = createMasker(page);
  await masker.applyMasks(predefinedMasks.charts);
}

export async function maskForForms(page: Page): Promise<void> {
  const masker = createMasker(page);
  await masker.applyMasks(predefinedMasks.forms);
}

export async function maskForUI(page: Page): Promise<void> {
  const masker = createMasker(page);
  await masker.applyMasks(predefinedMasks.ui);
}