import { describe, it, expect } from 'vitest';
import { useWorkspaceStore } from '@/lib/store';
import { SHEET_PRESETS } from '@/lib/presets';

describe('Store Presets Integration', () => {
  it('guards against preset divergence - ensures presets only come from lib/presets.ts', () => {
    // Create a temporary store instance to test the getPresetWidgets method
    const store = useWorkspaceStore.getState();

    // Test that all preset kinds return widgets from SHEET_PRESETS
    const kinds = ['valuation', 'charting', 'risk', 'options', 'blank'] as const;

    for (const kind of kinds) {
      const storeWidgets = store.getPresetWidgets(kind);
      const presetsWidgets = SHEET_PRESETS[kind]?.widgets ?? [];

      expect(storeWidgets).toEqual(presetsWidgets);

      // Ensure no preset is empty (would indicate a broken reference)
      if (kind !== 'blank') {
        expect(storeWidgets.length).toBeGreaterThan(0);
      }
    }
  });

  it('ensures presetVersion is present in new store instances', () => {
    const initialState = useWorkspaceStore.getState();
    expect(initialState.presetVersion).toBe(1);
  });

  it('creates identical layouts from preset across multiple calls', () => {
    const store = useWorkspaceStore.getState();

    // Test determinism of preset loading
    const widgets1 = store.getPresetWidgets('valuation');
    const widgets2 = store.getPresetWidgets('valuation');

    expect(widgets1).toEqual(widgets2);

    // Should return the same reference for efficiency (from SHEET_PRESETS)
    expect(widgets1).toBe(widgets2);

    // But different sheet kinds should return different arrays
    const riskWidgets = store.getPresetWidgets('risk');
    expect(riskWidgets).not.toBe(widgets1);
  });
});
