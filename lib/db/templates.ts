import { prisma } from './client'
import type { SheetKind } from '@/lib/presets'

type WidgetLayout = {
  x: number
  y: number
  w: number
  h: number
  i?: string
}

export type WidgetConfig = {
  type: string
  title: string
  layout: WidgetLayout
  props?: Record<string, unknown>
}

export type TemplateRecord = {
  id: string
  name: string
  kind: SheetKind
  title: string
  widgets: WidgetConfig[]
}

export async function listTemplates(): Promise<TemplateRecord[]> {
  const rows = await prisma.template.findMany({ orderBy: { updatedAt: 'desc' } })
  return rows.map((r: { id: string; name: string; kind: string; title: string; widgets: unknown }) => ({
    id: r.id,
    name: r.name,
    kind: r.kind as SheetKind,
    title: r.title,
    widgets: Array.isArray(r.widgets) ? (r.widgets as unknown as WidgetConfig[]) : ([] as WidgetConfig[])
  }))
}

export async function upsertTemplate(t: Omit<TemplateRecord, 'id'> & { id?: string }): Promise<TemplateRecord> {
  const row = await prisma.template.upsert({
    where: { name: t.name },
    update: { kind: t.kind, title: t.title, widgets: t.widgets as unknown as object },
    create: { name: t.name, kind: t.kind, title: t.title, widgets: t.widgets as unknown as object },
  })
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as SheetKind,
    title: row.title,
    widgets: (row.widgets as unknown as WidgetConfig[]) || []
  }
}

export async function deleteTemplateByName(name: string): Promise<boolean> {
  await prisma.template.delete({ where: { name } }).catch(() => {})
  return true
}

export async function getTemplateByName(name: string): Promise<TemplateRecord | null> {
  const row = await prisma.template.findUnique({ where: { name } })
  return row
    ? {
        id: row.id,
        name: row.name,
        kind: row.kind as SheetKind,
        title: row.title,
        widgets: (row.widgets as unknown as WidgetConfig[]) || []
      }
    : null
}


