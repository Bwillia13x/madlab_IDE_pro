import { z } from 'zod';
import type { WorkspaceState, Message, Sheet } from '@/lib/store';

// Zod schema for import payload
const zMessageIn = z.object({
  id: z.string().min(1).optional(),
  content: z.string(),
  sender: z.enum(['user', 'agent']).optional(),
  timestamp: z.union([z.string(), z.number(), z.date()]).optional(),
});

const zLayout = z.object({
  i: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const zWidget = z.object({
  id: z.string().optional(),
  type: z.string(),
  title: z.string(),
  layout: zLayout,
  props: z.record(z.unknown()).optional(),
  version: z.number().optional(),
});

const zSheet = z.object({
  id: z.string().optional(),
  kind: z.enum(['valuation', 'charting', 'risk', 'options', 'blank']).optional(),
  title: z.string().optional(),
  widgets: z.array(zWidget).optional(),
});

const zUi = z.object({
  theme: z.enum(['light', 'dark', 'malibu-sunrise', 'malibu-sunset']).optional(),
  explorerCollapsed: z.boolean().optional(),
  explorerWidth: z.number().optional(),
  chatCollapsed: z.boolean().optional(),
  bottomPanelHeight: z.number().optional(),
  bottomPanelCollapsed: z.boolean().optional(),
  activeBottomTab: z.string().optional(),
});

const zWorkspaceImport = z.object({
  schemaVersion: z.number().optional(),
  sheets: z.array(zSheet).optional(),
  activeSheetId: z.string().optional(),
  messages: z.array(zMessageIn).optional(),
  ui: zUi.optional(),
});

export type WorkspaceImportInput = z.infer<typeof zWorkspaceImport>;

export function parseWorkspaceImport(input: unknown): WorkspaceImportInput {
  if (typeof input === 'string') {
    try {
      return zWorkspaceImport.parse(JSON.parse(input));
    } catch (e) {
      // If JSON parse fails, rethrow to caller
      throw e;
    }
  }
  return zWorkspaceImport.parse(input);
}

export function coerceToWorkspaceState(
  parsed: WorkspaceImportInput
): Pick<
  WorkspaceState,
  | 'schemaVersion'
  | 'sheets'
  | 'activeSheetId'
  | 'messages'
  | 'theme'
  | 'explorerCollapsed'
  | 'explorerWidth'
  | 'chatCollapsed'
  | 'bottomPanelHeight'
  | 'bottomPanelCollapsed'
  | 'activeBottomTab'
> {
  const schemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1;

  const sheets: Sheet[] = Array.isArray(parsed.sheets)
    ? parsed.sheets.map(
        (s): Sheet => ({
          id: String(s.id ?? `sheet-${Math.random().toString(36).slice(2)}`),
          kind: s.kind ?? 'blank',
          title: s.title ?? 'Untitled',
          widgets: Array.isArray(s.widgets)
            ? s.widgets.map((w) => ({
                id: String(w.id ?? `widget-${Math.random().toString(36).slice(2)}`),
                type: String(w.type),
                title: String(w.title ?? 'Widget'),
                layout: {
                  i: String(w.id ?? w.layout?.i ?? ''),
                  x: Number(w.layout?.x ?? 0),
                  y: Number(w.layout?.y ?? 0),
                  w: Number(w.layout?.w ?? 6),
                  h: Number(w.layout?.h ?? 4),
                },
                props: w.props ? { ...w.props } : undefined,
                version: typeof w.version === 'number' ? w.version : 1,
              }))
            : [],
        })
      )
    : [];

  const activeSheetId = typeof parsed.activeSheetId === 'string' ? parsed.activeSheetId : undefined;

  const messages: Message[] = Array.isArray(parsed.messages)
    ? parsed.messages.map((m) => ({
        id: String(m.id ?? `msg-${Math.random().toString(36).slice(2)}`),
        content: String(m.content ?? ''),
        sender: m.sender === 'user' ? 'user' : 'agent',
        timestamp: new Date((m.timestamp as any) ?? Date.now()),
      }))
    : [];

  const ui = parsed.ui ?? {};

  return {
    schemaVersion,
    sheets,
    activeSheetId,
    messages,
    theme:
      ui?.theme === 'light' || ui?.theme === 'malibu-sunrise' || ui?.theme === 'malibu-sunset'
        ? (ui.theme as any)
        : 'dark',
    explorerCollapsed: Boolean(ui?.explorerCollapsed),
    explorerWidth: typeof ui?.explorerWidth === 'number' ? ui.explorerWidth : 280,
    chatCollapsed: Boolean(ui?.chatCollapsed),
    bottomPanelHeight: typeof ui?.bottomPanelHeight === 'number' ? ui.bottomPanelHeight : 200,
    bottomPanelCollapsed: Boolean(ui?.bottomPanelCollapsed),
    activeBottomTab: typeof ui?.activeBottomTab === 'string' ? ui.activeBottomTab : 'output',
  };
}
