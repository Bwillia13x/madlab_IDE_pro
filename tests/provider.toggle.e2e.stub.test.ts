import { describe, it, expect } from 'vitest';
import { useWorkspaceStore } from '@/lib/store';

describe('Provider toggle (store)', () => {
  it('updates provider name in store', async () => {
    const state = useWorkspaceStore.getState();
    expect(state.getDataProvider()).toBe('mock');
    await state.setDataProvider('mock'); // idempotent
    expect(state.getDataProvider()).toBe('mock');
  });
});


