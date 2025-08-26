import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProviderCapabilities, addPolygonProvider } from '@/lib/data/providers';

describe('getProviderCapabilities', () => {
  it('returns options enabled for mock', () => {
    const caps = getProviderCapabilities('mock');
    expect(caps.options).toBe(true);
    expect(caps.historical).toBe(true);
  });

  it('enables options for polygon', () => {
    // Add polygon provider with a dummy API key for testing
    addPolygonProvider('dummy-api-key');

    const caps = getProviderCapabilities('polygon');
    expect(caps.options).toBe(true);
  });
});


