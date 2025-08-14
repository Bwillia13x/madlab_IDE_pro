import { prisma } from './client'

export type WorkspaceRecord = {
  id: string
  title: string
  data: Record<string, unknown>
}

export async function listWorkspaces(): Promise<WorkspaceRecord[]> {
  const rows = await prisma.workspace.findMany({ orderBy: { updatedAt: 'desc' } })
  return rows.map((r: { id: string; title: string; data: unknown }) => ({ id: r.id, title: r.title, data: (r.data as Record<string, unknown>) || {} }))
}

export async function getWorkspace(id: string): Promise<WorkspaceRecord | null> {
  const row = await prisma.workspace.findUnique({ where: { id } })
  return row ? { id: row.id, title: row.title, data: (row.data as Record<string, unknown>) || {} } : null
}

export async function createWorkspace(title: string, data: Record<string, unknown>): Promise<WorkspaceRecord> {
  const row = await prisma.workspace.create({ data: { title, data: data as unknown as object } })
  return { id: row.id, title: row.title, data: (row.data as Record<string, unknown>) || {} }
}

export async function updateWorkspace(id: string, data: Partial<WorkspaceRecord>): Promise<WorkspaceRecord | null> {
  const row = await prisma.workspace
    .update({
      where: { id },
      data: {
        title: data.title,
        data: (data.data as unknown as object) || undefined,
      },
    })
    .catch(() => null)
  return row ? { id: row.id, title: row.title, data: (row.data as Record<string, unknown>) || {} } : null
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  await prisma.workspace.delete({ where: { id } }).catch(() => {})
  return true
}


