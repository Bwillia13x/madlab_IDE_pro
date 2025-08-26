/**
 * Visual Regression Tests using Playwright
 * Real screenshot comparison and baseline management
 */

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import * as pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

interface VisualRegressionOptions {
  threshold?: number;
  includeAA?: boolean;
  output?: string;
  diffColor?: [number, number, number];
  maskSelector?: string;
  fullPage?: boolean;
  viewportSize?: { width: number; height: number };
}

interface ComparisonResult {
  match: boolean;
  mismatchPercentage: number;
  diffImage?: Buffer;
  error?: string;
}

class PlaywrightVisualRegressionTester {
  private baselineDir = '__visual_baselines__';
  private diffDir = '__visual_diffs__';

  constructor(private page: any) {}

  async captureScreenshot(selector?: string, options: VisualRegressionOptions = {}): Promise<Buffer> {
    const screenshotOptions = {
      fullPage: options.fullPage || false,
      mask: options.maskSelector ? [{ selector: options.maskSelector }] : undefined,
    };

    if (selector) {
      return await this.page.locator(selector).screenshot(screenshotOptions);
    }

    return await this.page.screenshot(screenshotOptions);
  }

  compareScreenshots(
    actual: Buffer,
    baselinePath: string,
    options: VisualRegressionOptions = {}
  ): ComparisonResult {
    try {
      // Check if baseline exists
      if (!existsSync(baselinePath)) {
        // Create baseline directory if it doesn't exist
        const baselineDir = dirname(baselinePath);
        if (!existsSync(baselineDir)) {
          mkdirSync(baselineDir, { recursive: true });
        }

        // Save current screenshot as baseline
        writeFileSync(baselinePath, actual);
        return { match: true, mismatchPercentage: 0 };
      }

      // Load baseline
      const baseline = readFileSync(baselinePath);

      // Decode PNG images
      const actualPng = PNG.sync.read(actual);
      const baselinePng = PNG.sync.read(baseline);

      // Ensure images have the same dimensions
      if (actualPng.width !== baselinePng.width || actualPng.height !== baselinePng.height) {
        return {
          match: false,
          mismatchPercentage: 100,
          error: `Image dimensions don't match. Actual: ${actualPng.width}x${actualPng.height}, Baseline: ${baselinePng.width}x${baselinePng.height}`,
        };
      }

      // Create diff image
      const diffPng = new PNG({ width: actualPng.width, height: actualPng.height });
      const threshold = options.threshold || 0.1;

      // Compare images
      const mismatchedPixels = pixelmatch(
        actualPng.data,
        baselinePng.data,
        diffPng.data,
        actualPng.width,
        actualPng.height,
        {
          threshold,
          includeAA: options.includeAA !== false,
          diffColor: options.diffColor || [255, 0, 255],
        }
      );

      const totalPixels = actualPng.width * actualPng.height;
      const mismatchPercentage = (mismatchedPixels / totalPixels) * 100;

      // Convert diff PNG to buffer
      const diffBuffer = PNG.sync.write(diffPng);

      if (mismatchPercentage > (options.threshold || 0.1) * 100) {
        return {
          match: false,
          mismatchPercentage,
          diffImage: diffBuffer,
        };
      }

      return { match: true, mismatchPercentage };
    } catch (error) {
      return {
        match: false,
        mismatchPercentage: 100,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async assertVisualMatch(
    testName: string,
    selector?: string,
    options: VisualRegressionOptions = {}
  ): Promise<void> {
    const baselinePath = join(this.baselineDir, `${testName}.png`);

    // Capture screenshot
    const screenshot = await this.captureScreenshot(selector, options);

    // Compare with baseline
    const result = this.compareScreenshots(screenshot, baselinePath, options);

    if (!result.match) {
      const diffPath = join(this.diffDir, `${testName}.diff.png`);

      if (result.diffImage) {
        const diffDir = dirname(diffPath);
        if (!existsSync(diffDir)) {
          mkdirSync(diffDir, { recursive: true });
        }
        writeFileSync(diffPath, result.diffImage);
      }

      throw new Error(
        `Visual regression detected for "${testName}". ` +
          `Mismatch: ${result.mismatchPercentage.toFixed(2)}%. ` +
          `Diff saved to: ${diffPath}` +
          (result.error ? ` Error: ${result.error}` : '')
      );
    }
  }

  // Utility method to wait for component to be ready
  async waitForComponent(selector: string, timeout = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
    // Wait a bit more for any animations or dynamic content to settle
    await this.page.waitForTimeout(500);
  }

  // Utility method to mask dynamic content
  async maskDynamicContent(selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      try {
        const element = await this.page.locator(selector);
        if (await element.count() > 0) {
          await element.evaluate((el: HTMLElement) => {
            el.style.visibility = 'hidden';
          });
        }
      } catch (error) {
        // Selector might not exist, continue
        console.warn(`Could not mask selector ${selector}:`, error);
      }
    }
  }
}

// Test configuration for different viewports
const viewportConfigs = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  widescreen: { width: 1920, height: 1080 },
};

export { PlaywrightVisualRegressionTester, viewportConfigs, type VisualRegressionOptions };