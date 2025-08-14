import { NextRequest, NextResponse } from 'next/server'
import { listWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } from '@/lib/db/workspaces'
import { startServerMetricTimer, serverMetrics } from '@/lib/metrics/server'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const timer = startServerMetricTimer('workspaces:GET')
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const ws = await getWorkspace(id)
      const res = NextResponse.json({ workspace: ws })
      timer.stop(200)
      return res
    }
    const workspaces = await listWorkspaces()
    const res = NextResponse.json({ workspaces })
    timer.stop(200)
    return res
  } catch (e) {
    serverMetrics.inc('workspaces:GET:errors')
    timer.stop(500)
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const timer = startServerMetricTimer('workspaces:POST')
  try {
    const WorkspaceCreateSchema = z.object({
      title: z.string().min(1),
      data: z.record(z.unknown()),
    })
    const parsed = WorkspaceCreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }
    const ws = await createWorkspace(parsed.data.title, parsed.data.data)
    const res = NextResponse.json({ workspace: ws })
    timer.stop(200)
    return res
  } catch (e) {
    serverMetrics.inc('workspaces:POST:errors')
    timer.stop(500)
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const timer = startServerMetricTimer('workspaces:PUT')
  try {
    const WorkspaceUpdateSchema = z.object({
      id: z.string().min(1),
      title: z.string().min(1).optional(),
      data: z.record(z.unknown()).optional(),
    })
    const parsed = WorkspaceUpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }
    const ws = await updateWorkspace(parsed.data.id, { title: parsed.data.title, data: parsed.data.data })
    const res = NextResponse.json({ workspace: ws })
    timer.stop(200)
    return res
  } catch (e) {
    serverMetrics.inc('workspaces:PUT:errors')
    timer.stop(500)
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const timer = startServerMetricTimer('workspaces:DELETE')
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    await deleteWorkspace(id)
    const res = NextResponse.json({ ok: true })
    timer.stop(200)
    return res
  } catch (e) {
    serverMetrics.inc('workspaces:DELETE:errors')
    timer.stop(500)
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 })
  }
}


