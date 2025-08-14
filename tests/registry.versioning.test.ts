import { describe, it, expect, beforeEach } from 'vitest';
import { schemaWidgetRegistry, registerSchemaWidget, getSchemaWidget } from '@/lib/widgets/registry';
import type { WidgetDefinition } from '@/lib/widgets/schema';
import { z } from 'zod';

describe('Widget registry versioning', () => {
  beforeEach(() => {
    // Clear and re-instantiate by accessing private map indirectly: no API to clear, so register unique types per test
  });

  function makeDef(type: string, version?: string): WidgetDefinition {
    return {
      meta: {
        type,
        name: type,
        description: 'test',
        category: 'utility',
        version: (version ?? '0.0.0'),
        configSchema: z.object({ foo: z.string().default('bar') }),
        defaultConfig: { foo: 'bar' },
        defaultSize: { w: 2, h: 2 },
        capabilities: { resizable: true, configurable: true, dataBinding: false, exportable: false, realTimeData: false },
      },
      runtime: { component: () => null as any },
    };
  }

  it('registers and retrieves by type; preserves meta.version', () => {
    const type = `test-widget-${Date.now()}`;
    const def = makeDef(type, '1.2.3');
    const ok = registerSchemaWidget(def);
    expect(ok).toBe(true);
    const entry = getSchemaWidget(type);
    expect(entry).toBeDefined();
    expect(entry!.definition.meta.version).toBe('1.2.3');
  });

  it('overwrites on duplicate type registration (latest wins)', () => {
    const type = `dup-widget-${Date.now()}`;
    const v1 = makeDef(type, '1.0.0');
    const v2 = makeDef(type, '2.0.0');
    expect(registerSchemaWidget(v1)).toBe(true);
    expect(registerSchemaWidget(v2)).toBe(true);
    const entry = getSchemaWidget(type);
    expect(entry!.definition.meta.version).toBe('2.0.0');
  });
});


