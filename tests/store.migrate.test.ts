import { describe, it, expect } from 'vitest';
import { migrateState, PERSIST_VERSION } from '@/lib/store';

describe('Zustand persist migrations', () => {
  it('PERSIST_VERSION is 1', () => {
    expect(PERSIST_VERSION).toBe(1);
  });

  it('migrates legacy (v0) state and sets defaults/coerces types', () => {
    const legacy: any = {
      sheets: [
        {
          id: 123,
          kind: 'unknown', // invalid
          title: 99,
          widgets: [
            {
              id: null,
              type: 'kpi-card',
              title: undefined,
              layout: { i: undefined, x: '1', y: '2', w: '3', h: 4 },
            },
          ],
        },
      ],
      activeSheetId: 123,
      messages: [
        { id: 1, content: 'hi', timestamp: '2024-01-01T00:00:00.000Z', sender: 'user' },
        { id: 2, content: 'agent here', timestamp: Date.now(), sender: 'agent' },
      ],
      theme: 'light',
      explorerCollapsed: false,
      // explorerWidth omitted => default 280
      chatCollapsed: 0, // falsy -> false
      bottomPanelHeight: '250', // not number -> default 200
      bottomPanelCollapsed: 1, // truthy -> true
      activeBottomTab: 123, // not string -> default 'output'
      selectedWidgetId: 1,
      inspectorOpen: 'no',
    };

    const migrated: any = migrateState(legacy, 0);

    // schema version
    expect(migrated.schemaVersion).toBe(1);

    // preset version should be added when missing
    expect(migrated.presetVersion).toBe(1);

    // ui defaults & coercions
    expect(migrated.theme).toBe('light');
    expect(migrated.explorerCollapsed).toBe(false);
    expect(migrated.explorerWidth).toBe(280);
    expect(migrated.chatCollapsed).toBe(false);
    expect(migrated.bottomPanelHeight).toBe(200);
    expect(migrated.bottomPanelCollapsed).toBe(true);
    expect(migrated.activeBottomTab).toBe('output');

    // selection & inspector
    expect(
      migrated.selectedWidgetId === undefined || typeof migrated.selectedWidgetId === 'string'
    ).toBe(true);
    expect(typeof migrated.inspectorOpen).toBe('boolean');

    // sheets/widgets normalized
    expect(Array.isArray(migrated.sheets)).toBe(true);
    expect(typeof migrated.sheets[0].id).toBe('string');
    expect(migrated.sheets[0].kind).toBe('blank');
    expect(typeof migrated.sheets[0].title).toBe('string');
    expect(Array.isArray(migrated.sheets[0].widgets)).toBe(true);
    const w = migrated.sheets[0].widgets[0];
    expect(typeof w.id).toBe('string');
    expect(typeof w.title).toBe('string');
    expect(typeof w.type).toBe('string');
    expect(typeof w.layout.x).toBe('number');
    expect(typeof w.layout.y).toBe('number');
    expect(typeof w.layout.w).toBe('number');
    expect(typeof w.layout.h).toBe('number');

    // messages are revived to Date
    expect(migrated.messages.length).toBe(2);
    expect(migrated.messages[0].timestamp instanceof Date).toBe(true);
    expect(['user', 'agent']).toContain(migrated.messages[0].sender);
  });

  it('migrates state without presetVersion and adds default', () => {
    const stateWithoutPresetVersion: any = {
      sheets: [],
      messages: [],
      theme: 'dark',
      explorerCollapsed: false,
      explorerWidth: 280,
      chatCollapsed: false,
      bottomPanelHeight: 200,
      bottomPanelCollapsed: false,
      activeBottomTab: 'output',
      selectedWidgetId: undefined,
      inspectorOpen: false,
      schemaVersion: 1,
      // presetVersion is missing
    };

    const migrated = migrateState(stateWithoutPresetVersion, 1);

    expect(migrated.presetVersion).toBe(1);
  });
});
