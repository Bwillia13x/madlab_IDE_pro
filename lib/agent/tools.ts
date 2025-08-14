import { useWorkspaceStore } from '@/lib/store';
import type { Widget } from '@/lib/types';
import type { SheetKind } from '@/lib/presets';
import { getDataProvider } from '@/lib/data/providers';
import type { PriceRange } from '@/lib/data/providers';

export type ToolCall = {
  name: 'add_sheet' | 'add_widget' | 'select_widget' | 'rename_sheet' | 'remove_widget' | 'close_sheet' | 'duplicate_widget' | 'open_inspector' | 'fetch_prices' | 'fetch_kpis'
  args: Record<string, unknown>
}

export type ToolResult = { 
  ok: true; 
  message: string; 
  data?: any 
} | { 
  ok: false; 
  message: string; 
  error?: string 
}

function getStore() {
  return useWorkspaceStore.getState()
}

export function add_sheet(args: { kind: SheetKind; title?: string }): ToolResult {
  const { kind, title } = args
  if (!kind) return { ok: false, message: 'Missing kind' }
  getStore().addSheet(kind, typeof title === 'string' ? title : undefined)
  return { ok: true, message: `Added ${kind} sheet` }
}

export function rename_sheet(args: { title: string }): ToolResult {
  const { title } = args
  if (!title || typeof title !== 'string') return { ok: false, message: 'Missing title' }
  const { activeSheetId, updateSheetTitle } = getStore()
  if (!activeSheetId) return { ok: false, message: 'No active sheet' }
  updateSheetTitle(activeSheetId, title)
  return { ok: true, message: `Renamed sheet to "${title}"` }
}

export function select_widget(args: { id: string }): ToolResult {
  const { id } = args
  if (!id || typeof id !== 'string') return { ok: false, message: 'Missing id' }
  const { setSelectedWidget } = getStore()
  setSelectedWidget(id)
  return { ok: true, message: `Selected widget ${id}` }
}

export function add_widget(args: { type: string; title?: string; props?: Record<string, unknown> }): ToolResult {
  const { type, title, props } = args
  if (!type || typeof type !== 'string') return { ok: false, message: 'Missing type' }
  const store = getStore()
  const sheetId = store.activeSheetId
  if (!sheetId) return { ok: false, message: 'No active sheet' }
  const sheet = store.sheets.find(s => s.id === sheetId)
  const nextY = sheet?.widgets.reduce((m, w) => Math.max(m, w.layout.y + w.layout.h), 0) ?? 0
  const widget: Omit<Widget, 'id'> = {
    type,
    title: title && typeof title === 'string' ? title : (type.replace(/[-_]/g,' ').replace(/\b\w/g, c => c.toUpperCase())),
    layout: { i: '', x: 0, y: nextY, w: 6, h: 4 },
    props: props && typeof props === 'object' ? props : undefined,
  }
  store.addWidget(sheetId, widget)
  return { ok: true, message: `Added widget ${widget.title}` }
}

export function close_sheet(): ToolResult {
  const store = getStore()
  if (!store.activeSheetId) return { ok: false, message: 'No active sheet' }
  store.closeSheet(store.activeSheetId)
  return { ok: true, message: 'Closed active sheet' }
}

export function remove_widget(args: { id: string }): ToolResult {
  const { id } = args;
  if (!id || typeof id !== 'string') return { ok: false, message: 'Missing id' };
  const store = getStore();
  const sheetId = store.activeSheetId;
  if (!sheetId) return { ok: false, message: 'No active sheet' };
  
  // Find widget title for better messaging
  const sheet = store.sheets.find(s => s.id === sheetId);
  const widget = sheet?.widgets.find(w => w.id === id);
  const widgetTitle = widget?.title || id;
  
  store.removeWidget(sheetId, id);
  return { ok: true, message: `Removed widget "${widgetTitle}"` };
}

export function duplicate_widget(args: { id?: string }): ToolResult {
  const store = getStore();
  const sheetId = store.activeSheetId;
  if (!sheetId) return { ok: false, message: 'No active sheet' };
  
  const widgetId = args.id || store.selectedWidgetId;
  if (!widgetId || typeof widgetId !== 'string') {
    return { ok: false, message: 'No widget selected or specified' };
  }
  
  const sheet = store.sheets.find(s => s.id === sheetId);
  const widget = sheet?.widgets.find(w => w.id === widgetId);
  if (!widget) return { ok: false, message: 'Widget not found' };
  
  store.duplicateWidget(sheetId, widgetId);
  return { ok: true, message: `Duplicated widget "${widget.title}"` };
}

export function open_inspector(args: { id?: string }): ToolResult {
  const store = getStore();
  const widgetId = args.id || store.selectedWidgetId;
  
  if (!widgetId || typeof widgetId !== 'string') {
    return { ok: false, message: 'No widget selected or specified' };
  }
  
  // Find widget to get title
  const sheet = store.sheets.find(s => s.id === store.activeSheetId);
  const widget = sheet?.widgets.find(w => w.id === widgetId);
  if (!widget) return { ok: false, message: 'Widget not found' };
  
  store.setSelectedWidget(widgetId);
  if (store.setInspectorOpen) {
    store.setInspectorOpen(true);
  }
  
  return { ok: true, message: `Opened inspector for "${widget.title}"` };
}

export function fetch_prices(args: { symbol: string; range?: PriceRange }): ToolResult {
  const symbol = typeof args.symbol === 'string' ? args.symbol.toUpperCase() : ''
  const range = (args.range as PriceRange) || '6M'
  if (!symbol) return { ok: false, message: 'Missing symbol' }
  try {
    const provider = getDataProvider()
    if (!provider) return { ok: false, message: 'No data provider' }
    // Warm cache in background
    ;(async () => {
      try {
        const data = await provider.getPrices(symbol, range)
        console.debug('agent.fetch_prices fetched', symbol, range, 'points=', data?.length ?? 0)
      } catch {}
    })()
    return { ok: true, message: `Fetching prices for ${symbol} (${range})` }
  } catch (e) {
    return { ok: false, message: 'Failed to fetch prices', error: e instanceof Error ? e.message : String(e) }
  }
}

export function fetch_kpis(args: { symbol: string }): ToolResult {
  const symbol = typeof args.symbol === 'string' ? args.symbol.toUpperCase() : ''
  if (!symbol) return { ok: false, message: 'Missing symbol' }
  try {
    const provider = getDataProvider()
    if (!provider) return { ok: false, message: 'No data provider' }
    ;(async () => {
      try {
        const k = await provider.getKpis(symbol)
        console.debug('agent.fetch_kpis fetched', symbol, 'price=', k?.price)
      } catch {}
    })()
    return { ok: true, message: `Fetching KPIs for ${symbol}` }
  } catch (e) {
    return { ok: false, message: 'Failed to fetch KPIs', error: e instanceof Error ? e.message : String(e) }
  }
}

export function runToolCall(tc: ToolCall): ToolResult {
  // Type guards for args
  const isKind = (k: unknown): k is SheetKind =>
    typeof k === 'string' && ['valuation', 'charting', 'risk', 'options', 'blank'].includes(k)

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null

  const getStr = (o: Record<string, unknown>, key: string): string | undefined => {
    const v = o[key]
    return typeof v === 'string' ? v : undefined
  }

  const isAddSheetArgs = (a: unknown): a is { kind: SheetKind; title?: string } => {
    if (!isRecord(a)) return false
    const kind = getStr(a, 'kind')
    if (!kind || !isKind(kind)) return false
    const title = a['title']
    return typeof title === 'undefined' || typeof title === 'string'
  }

  const isRenameArgs = (a: unknown): a is { title: string } =>
    isRecord(a) && typeof a['title'] === 'string'

  const isSelectArgs = (a: unknown): a is { id: string } =>
    isRecord(a) && typeof a['id'] === 'string'

  const isAddWidgetArgs = (a: unknown): a is { type: string; title?: string; props?: Record<string, unknown> } =>
    isRecord(a) && typeof a['type'] === 'string'

  const isDuplicateArgs = (a: unknown): a is { id?: string } =>
    isRecord(a) && (typeof a['id'] === 'undefined' || typeof a['id'] === 'string')

  const isInspectorArgs = (a: unknown): a is { id?: string } =>
    isRecord(a) && (typeof a['id'] === 'undefined' || typeof a['id'] === 'string')

  switch (tc.name) {
    case 'add_sheet':
      return isAddSheetArgs(tc.args) ? add_sheet(tc.args) : { ok: false, message: 'Invalid args for add_sheet' }
    case 'add_widget':
      return isAddWidgetArgs(tc.args) ? add_widget(tc.args) : { ok: false, message: 'Invalid args for add_widget' }
    case 'select_widget':
      return isSelectArgs(tc.args) ? select_widget(tc.args) : { ok: false, message: 'Invalid args for select_widget' }
    case 'rename_sheet':
      return isRenameArgs(tc.args) ? rename_sheet(tc.args) : { ok: false, message: 'Invalid args for rename_sheet' }
    case 'duplicate_widget':
      return isDuplicateArgs(tc.args) ? duplicate_widget(tc.args) : { ok: false, message: 'Invalid args for duplicate_widget' }
    case 'open_inspector':
      return isInspectorArgs(tc.args) ? open_inspector(tc.args) : { ok: false, message: 'Invalid args for open_inspector' }
    case 'fetch_prices':
      return isRecord(tc.args) && typeof tc.args['symbol'] === 'string' ? fetch_prices(tc.args as any) : { ok: false, message: 'Invalid args for fetch_prices' }
    case 'fetch_kpis':
      return isRecord(tc.args) && typeof tc.args['symbol'] === 'string' ? fetch_kpis(tc.args as any) : { ok: false, message: 'Invalid args for fetch_kpis' }
    case 'remove_widget':
      return { ok: false, message: 'Destructive tool requires confirmation' }
    case 'close_sheet':
      return { ok: false, message: 'Destructive tool requires confirmation' }
    default:
      return { ok: false, message: `Unknown tool: ${String((tc as { name: unknown }).name)}` }
  }
}
