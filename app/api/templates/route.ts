import { NextRequest, NextResponse } from 'next/server'
import { listTemplates, upsertTemplate, deleteTemplateByName, getTemplateByName } from '@/lib/db/templates'
import { serverMetrics, startServerMetricTimer } from '@/lib/metrics/server'
import type { SheetKind } from '@/lib/presets'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const timer = startServerMetricTimer('templates:GET')
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    if (name) {
      const t = await getTemplateByName(name)
      const res = NextResponse.json({ template: t })
      timer.stop(200)
      return res
    }
    const templates = await listTemplates()
    const res = NextResponse.json({ templates })
    timer.stop(200)
    return res
  } catch (e) {
    serverMetrics.inc('templates:GET:errors')
    timer.stop(500)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const timer = startServerMetricTimer('templates:POST')
  try {
    const TemplateSchema = z.object({
      name: z.string().min(1),
      kind: z.string().min(1),
      title: z.string().min(1),
      widgets: z.array(z.object({
        type: z.string().min(1),
        title: z.string().min(1),
        layout: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), i: z.string().optional() }),
        props: z.record(z.unknown()).optional(),
      })).default([]),
    })
    const parsed = TemplateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }
    const t = await upsertTemplate({
      name: parsed.data.name,
      kind: parsed.data.kind as SheetKind,
      title: parsed.data.title,
      widgets: parsed.data.widgets,
    })
    const res = NextResponse.json({ template: t })
    timer.stop(200)
    return res
  } catch (e) {
    serverMetrics.inc('templates:POST:errors')
    timer.stop(500)
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const timer = startServerMetricTimer('templates:DELETE')
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    }
    await deleteTemplateByName(name)
    const res = NextResponse.json({ ok: true })
    timer.stop(200)
    return res
  } catch (e) {
    serverMetrics.inc('templates:DELETE:errors')
    timer.stop(500)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}


