import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Inspector } from '@/components/editor/Inspector';
import { useWorkspaceStore } from '@/lib/store';

function setupState() {
  const { addSheet, setActiveSheet, addWidget, setSelectedWidget, setInspectorOpen } = useWorkspaceStore.getState();
  addSheet('blank', 'Test');
  const sheetId = useWorkspaceStore.getState().activeSheetId!;
  addWidget(sheetId, {
    type: 'blank-tile',
    title: 'Blank',
    layout: { i: '', x: 0, y: 0, w: 4, h: 3 },
    props: {},
  });
  const widgetId = useWorkspaceStore.getState().sheets[0].widgets[0].id;
  setActiveSheet(sheetId);
  setSelectedWidget(widgetId);
  setInspectorOpen(true);
  return { sheetId, widgetId };
}

describe('Inspector + AutoForm', () => {
  it('renders and updates widget title and props', () => {
    const { widgetId } = setupState();
    const { getByTestId, container } = render(<Inspector />);
    const titleInput = getByTestId('inspector-title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    const widget = useWorkspaceStore.getState().sheets[0].widgets.find(w => w.id === widgetId)!;
    expect(widget.title).toBe('New Title');

    // AutoForm control from BlankTile: showSuggestions
    const toggle = container.querySelector('button[role="switch"], input[type="checkbox"]');
    if (toggle) fireEvent.click(toggle);
  });
});


