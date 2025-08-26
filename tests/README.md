# Test Isolation Documentation

This document describes the test isolation utilities and best practices for maintaining clean test environments.

## Overview

Test isolation problems can cause flaky tests, false positives, and difficult-to-debug issues. This project implements comprehensive test isolation utilities to prevent:

- Global mock pollution across tests
- Component instance conflicts
- DOM state pollution
- Memory leaks from shared resources

## Test Isolation Utilities

### `tests/test-isolation.ts`

The main test isolation utilities are located in `tests/test-isolation.ts`. This file provides:

#### Core Functions

- `setupWidgetTest()`: Setup for widget component tests
- `setupVisualizationTest()`: Setup for visualization component tests
- `cleanupTest()`: General cleanup for all tests
- `TestIsolation`: Object containing detailed isolation utilities

#### Usage Examples

**For Widget Tests:**
```typescript
import { setupWidgetTest, cleanupTest } from '../test-isolation';

describe('MyWidget', () => {
  beforeEach(() => {
    setupWidgetTest();
    // Your test-specific setup
  });

  afterEach(() => {
    cleanupTest();
  });

  it('should render correctly', () => {
    // Test code
  });
});
```

**For Visualization Tests:**
```typescript
import { setupVisualizationTest, cleanupTest, TestIsolation } from '../test-isolation';

describe('VisualizationEngine', () => {
  beforeEach(() => {
    setupVisualizationTest();
    // Your test-specific setup
  });

  afterEach(() => {
    TestIsolation.resetCanvasMocks();
    cleanupTest();
  });
});
```

## Test Isolation Features

### 1. Global Mock Management

**Problem**: Global mocks persist across tests, causing pollution.

**Solution**: Automatic reset of global mocks in each test:
- Console methods (log, debug, info, warn, error)
- Fetch API
- Animation frame functions
- Canvas API
- DOM APIs (ResizeObserver, IntersectionObserver)

### 2. DOM Cleanup

**Problem**: Rendered components and DOM elements persist between tests.

**Solution**: Automatic cleanup using `@testing-library/react`'s `cleanup()` function.

### 3. Canvas Mock Isolation

**Problem**: Canvas mocks conflict between tests.

**Solution**: Isolated canvas mocks with proper cleanup for each test.

### 4. Memory Leak Prevention

**Problem**: Event listeners and shared objects cause memory leaks.

**Solution**: Isolated event listener management with proper cleanup.

## Best Practices

### 1. Always Use Test Isolation

```typescript
// ✅ Good
beforeEach(() => {
  setupWidgetTest();
});

afterEach(() => {
  cleanupTest();
});

// ❌ Bad
beforeEach(() => {
  vi.clearAllMocks();
  // Missing comprehensive cleanup
});
```

### 2. Use Specific Setup Functions

```typescript
// ✅ Good - Use appropriate setup for test type
beforeEach(() => {
  setupVisualizationTest(); // For visualization tests
});

// ✅ Good - Use appropriate setup for test type
beforeEach(() => {
  setupWidgetTest(); // For widget tests
});
```

### 3. Avoid Global State in Tests

```typescript
// ❌ Bad - Global state persists
let globalState: any;

beforeEach(() => {
  globalState = { data: [] };
});

// ✅ Good - Fresh state each test
let testState: any;

beforeEach(() => {
  testState = { data: [] };
});
```

### 4. Clean Up Subscriptions

```typescript
// ✅ Good
let unsubscribe: (() => void) | undefined;

beforeEach(() => {
  // Setup subscription
  unsubscribe = someService.subscribe(() => {});
});

afterEach(() => {
  unsubscribe?.();
  cleanupTest();
});
```

## Common Issues Fixed

### 1. Mock Conflicts

**Before**: Tests had conflicting lucide-react mocks
**After**: Centralized mock management prevents conflicts

### 2. State Pollution

**Before**: Global fetch mock persisted across tests
**After**: Automatic reset ensures clean state

### 3. Component Instance Conflicts

**Before**: Multiple component instances shared state
**After**: Proper cleanup removes all DOM elements

### 4. Memory Leaks

**Before**: Event listeners accumulated across tests
**After**: Isolated event listeners with cleanup

## Migration Guide

### Updating Existing Tests

1. Add import:
```typescript
import { setupWidgetTest, cleanupTest } from '../test-isolation';
```

2. Replace beforeEach:
```typescript
// Old
beforeEach(() => {
  vi.clearAllMocks();
});

// New
beforeEach(() => {
  setupWidgetTest();
});
```

3. Add afterEach:
```typescript
// New
afterEach(() => {
  cleanupTest();
});
```

4. Remove conflicting mocks (e.g., local lucide-react mocks)

### For Visualization Tests

Use `setupVisualizationTest()` and `TestIsolation.resetCanvasMocks()`:

```typescript
beforeEach(() => {
  setupVisualizationTest();
});

afterEach(() => {
  TestIsolation.resetCanvasMocks();
  cleanupTest();
});
```

## Troubleshooting

### Tests Still Interfere

1. Check for global state not covered by isolation utilities
2. Ensure all subscriptions are cleaned up
3. Verify no shared module-level variables

### Mock Not Working

1. Check if mock is properly reset in `setupWidgetTest()`
2. Ensure mock is called before component import
3. Verify mock implementation matches expectations

### Performance Issues

1. Too many global resets - consider selective resets if needed
2. Memory leaks - check for proper cleanup of event listeners
3. Slow cleanup - ensure cleanup functions are efficient

## Contributing

When adding new test isolation features:

1. Update `tests/test-isolation.ts`
2. Add appropriate setup functions for specific test types
3. Document new utilities in this README
4. Update existing tests to use new utilities
5. Add tests for the isolation utilities themselves