import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TemplatePickerDialog } from '@/components/editor/TemplatePickerDialog';
import { useWorkspaceStore } from '@/lib/store';

describe('Template Picker Dialog', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ sheets: [], activeSheetId: undefined });
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('opens dialog, filters templates, and creates sheet', async () => {
    const store = useWorkspaceStore.getState();
    // Prepare one template
    store.addSheet('valuation', 'Valuation Workbench');
    const sheetId = useWorkspaceStore.getState().activeSheetId!;
    store.saveTemplate('ValTpl', sheetId);

    const { getByTestId } = render(
      <TemplatePickerDialog
        open
        onOpenChange={() => {}}
        onCreate={(name) => {
          useWorkspaceStore.getState().createSheetFromTemplate(name);
        }}
      />
    );

    // Filter by name
    const input = getByTestId('template-search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Val' } });

    // Select and create
    getByTestId('template-row-ValTpl').click();
    getByTestId('template-create').click();

    const state = useWorkspaceStore.getState();
    expect(state.sheets.length).toBe(2);
  });
});


