/**
 * Visual Regression Testing Configuration
 * Centralized configuration for viewports, masking, thresholds, and test settings
 */

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface MaskConfig {
  selector: string;
  description: string;
  reason: string;
}

export interface VisualRegressionConfig {
  viewports: ViewportConfig[];
  thresholds: {
    default: number;
    strict: number;
    relaxed: number;
  };
  masks: {
    dynamic: MaskConfig[];
    sensitive: MaskConfig[];
    animated: MaskConfig[];
  };
  screenshot: {
    fullPage: boolean;
    animations: 'disabled' | 'allow';
    caret: 'hide' | 'initial';
    scale: 'css' | 'device';
  };
  comparison: {
    pixelRatio: number;
    captureBeyondViewport: boolean;
    skipOffscreen: boolean;
  };
  retries: {
    maxRetries: number;
    retryDelay: number;
  };
}

// Standard viewport configurations
export const viewports: ViewportConfig[] = [
  {
    name: 'mobile',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'mobile-large',
    width: 414,
    height: 896,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'tablet',
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'tablet-landscape',
    width: 1024,
    height: 768,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    isLandscape: true,
  },
  {
    name: 'desktop',
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: 'desktop-wide',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: 'desktop-ultrawide',
    width: 2560,
    height: 1440,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
];

// Content masks for dynamic or sensitive elements
export const masks: {
  dynamic: MaskConfig[];
  sensitive: MaskConfig[];
  animated: MaskConfig[];
} = {
  // Dynamic content that changes frequently
  dynamic: [
    {
      selector: '[data-testid*="timestamp"]',
      description: 'Timestamps',
      reason: 'Timestamps change frequently and should not cause visual regression failures',
    },
    {
      selector: '[data-testid*="random"]',
      description: 'Random data',
      reason: 'Random or generated data should be masked to avoid false positives',
    },
    {
      selector: '.chart-random-value',
      description: 'Random chart values',
      reason: 'Chart values that are randomly generated should be masked',
    },
    {
      selector: '[data-testid*="session-id"]',
      description: 'Session IDs',
      reason: 'Session identifiers change per test run',
    },
  ],

  // Sensitive content that should not be captured
  sensitive: [
    {
      selector: '[data-testid*="api-key"]',
      description: 'API keys',
      reason: 'API keys should not be captured in screenshots',
    },
    {
      selector: '[data-testid*="password"]',
      description: 'Password fields',
      reason: 'Password fields should be masked for security',
    },
    {
      selector: '.sensitive-data',
      description: 'Sensitive data',
      reason: 'Any element marked as sensitive should be masked',
    },
  ],

  // Animated content that may cause inconsistent screenshots
  animated: [
    {
      selector: '[data-testid*="loading"]',
      description: 'Loading spinners',
      reason: 'Loading animations can cause inconsistent screenshots',
    },
    {
      selector: '.animate-pulse',
      description: 'Pulse animations',
      reason: 'Pulse animations can cause visual differences',
    },
    {
      selector: '.animate-spin',
      description: 'Spin animations',
      reason: 'Spin animations can cause visual differences',
    },
    {
      selector: '[data-testid*="progress"]',
      description: 'Progress indicators',
      reason: 'Progress bars may show different states',
    },
  ],
};

// Visual regression configuration
export const visualRegressionConfig: VisualRegressionConfig = {
  viewports,
  thresholds: {
    default: 0.05, // 5% difference threshold
    strict: 0.01,  // 1% difference for critical components
    relaxed: 0.1,  // 10% difference for flexible layouts
  },
  masks,
  screenshot: {
    fullPage: false, // Take viewport screenshots by default
    animations: 'disabled', // Disable animations for consistent screenshots
    caret: 'hide', // Hide text cursor
    scale: 'css', // Use CSS pixels
  },
  comparison: {
    pixelRatio: 1, // Pixel ratio for comparison
    captureBeyondViewport: false, // Don't capture beyond viewport
    skipOffscreen: true, // Skip offscreen elements
  },
  retries: {
    maxRetries: 3, // Maximum retry attempts
    retryDelay: 1000, // Delay between retries in milliseconds
  },
};

// Component-specific configurations
export const componentConfigs = {
  // Chart components need stricter thresholds
  chart: {
    threshold: visualRegressionConfig.thresholds.strict,
    masks: [
      ...masks.dynamic,
      ...masks.animated,
      {
        selector: '.chart-tooltip',
        description: 'Chart tooltips',
        reason: 'Tooltips may appear in different positions',
      },
    ],
    viewports: ['desktop', 'tablet', 'mobile'],
  },

  // UI components with relaxed thresholds for minor styling differences
  ui: {
    threshold: visualRegressionConfig.thresholds.default,
    masks: masks.sensitive,
    viewports: ['desktop', 'tablet', 'mobile'],
  },

  // Layout components need to be tested across all viewports
  layout: {
    threshold: visualRegressionConfig.thresholds.relaxed,
    masks: [...masks.dynamic, ...masks.animated],
    viewports: ['mobile', 'mobile-large', 'tablet', 'tablet-landscape', 'desktop', 'desktop-wide'],
  },

  // Dashboard components with comprehensive viewport testing
  dashboard: {
    threshold: visualRegressionConfig.thresholds.default,
    masks: [
      ...masks.dynamic,
      ...masks.animated,
      {
        selector: '.dashboard-timestamp',
        description: 'Dashboard timestamps',
        reason: 'Dashboard timestamps update frequently',
      },
      {
        selector: '.live-indicator',
        description: 'Live data indicators',
        reason: 'Live indicators may blink or change state',
      },
    ],
    viewports: ['mobile', 'tablet', 'desktop', 'desktop-wide'],
  },

  // Form components with focus state testing
  form: {
    threshold: visualRegressionConfig.thresholds.strict,
    masks: masks.sensitive,
    viewports: ['desktop', 'tablet', 'mobile'],
    testStates: ['normal', 'focus', 'error', 'disabled'], // States to test
  },
};

// Utility functions for configuration
export function getViewportByName(name: string): ViewportConfig | undefined {
  return viewports.find(viewport => viewport.name === name);
}

export function getMasksForComponent(componentType: keyof typeof componentConfigs): MaskConfig[] {
  return componentConfigs[componentType].masks || [];
}

export function getThresholdForComponent(componentType: keyof typeof componentConfigs): number {
  return componentConfigs[componentType].threshold || visualRegressionConfig.thresholds.default;
}

export function getViewportsForComponent(componentType: keyof typeof componentConfigs): ViewportConfig[] {
  const viewportNames = componentConfigs[componentType].viewports || ['desktop'];
  return viewportNames.map(name => getViewportByName(name)).filter(Boolean) as ViewportConfig[];
}

// Test naming conventions
export const testNaming = {
  pattern: '{component}-{state}-{viewport}',
  examples: [
    'button-default-desktop',
    'button-hover-tablet',
    'form-focus-mobile',
    'chart-loading-desktop-wide',
    'dashboard-empty-tablet-landscape',
  ],
};

// Baseline management
export const baselineConfig = {
  directory: '__visual_baselines__',
  diffDirectory: '__visual_diffs__',
  updateBaseline: process.env.UPDATE_BASELINE === 'true',
  generateDiffs: true,
  failOnMissingBaseline: false, // Create baseline if missing
};

// CI/CD integration
export const ciConfig = {
  enabled: process.env.CI === 'true',
  updateBaselines: process.env.UPDATE_BASELINE === 'true',
  failOnVisualRegression: process.env.FAIL_ON_VISUAL_REGRESSION !== 'false',
  maxDiffPixels: 100, // Maximum number of different pixels allowed
  maxDiffPercentage: 0.05, // Maximum percentage of different pixels
};

// Export default configuration
export default visualRegressionConfig;