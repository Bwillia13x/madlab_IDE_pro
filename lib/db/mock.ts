type TemplateRow = {
  id: string
  name: string
  kind: string
  title: string
  widgets: unknown
  createdAt: Date
  updatedAt: Date
}

type WorkspaceRow = {
  id: string
  title: string
  data: unknown
  createdAt: Date
  updatedAt: Date
}

function cuid() {
  return `mock_${Math.random().toString(36).slice(2)}${Date.now()}`
}

const db = {
  templates: [] as TemplateRow[],
  workspaces: [] as WorkspaceRow[],
}

export type MockPrisma = {
  template: {
    findMany: (args?: { orderBy?: { updatedAt: 'desc' | 'asc' } }) => Promise<TemplateRow[]>
    upsert: (args: { where: { name: string }, update: Partial<TemplateRow>, create: Omit<TemplateRow, 'id'|'createdAt'|'updatedAt'> & { id?: string } }) => Promise<TemplateRow>
    delete: (args: { where: { name: string } }) => Promise<void>
    findUnique: (args: { where: { name: string } }) => Promise<TemplateRow | null>
  }
  workspace: {
    findMany: (args?: { orderBy?: { updatedAt: 'desc' | 'asc' } }) => Promise<WorkspaceRow[]>
    findUnique: (args: { where: { id: string } }) => Promise<WorkspaceRow | null>
    create: (args: { data: { title: string, data: unknown } }) => Promise<WorkspaceRow>
    update: (args: { where: { id: string }, data: Partial<WorkspaceRow> }) => Promise<WorkspaceRow>
    delete: (args: { where: { id: string } }) => Promise<void>
  }
}

export function createMockPrisma(): MockPrisma {
  return {
    template: {
      async findMany() {
        return [...db.templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      },
      async upsert({ where, update, create }) {
        const existing = db.templates.find(t => t.name === where.name)
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() })
          return existing
        }
        const row: TemplateRow = {
          id: create.id || cuid(),
          name: create.name,
          kind: String(create.kind),
          title: String(create.title),
          widgets: create.widgets,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        db.templates.push(row)
        return row
      },
      async delete({ where }) {
        const idx = db.templates.findIndex(t => t.name === where.name)
        if (idx >= 0) db.templates.splice(idx, 1)
      },
      async findUnique({ where }) {
        return db.templates.find(t => t.name === where.name) || null
      },
    },
    workspace: {
      async findMany() {
        return [...db.workspaces].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      },
      async findUnique({ where }) {
        return db.workspaces.find(w => w.id === where.id) || null
      },
      async create({ data }) {
        const row: WorkspaceRow = { id: cuid(), title: String(data.title), data: data.data, createdAt: new Date(), updatedAt: new Date() }
        db.workspaces.push(row)
        return row
      },
      async update({ where, data }) {
        const row = db.workspaces.find(w => w.id === where.id)
        if (!row) throw new Error('Not found')
        Object.assign(row, data, { updatedAt: new Date() })
        return row
      },
      async delete({ where }) {
        const idx = db.workspaces.findIndex(w => w.id === where.id)
        if (idx >= 0) db.workspaces.splice(idx, 1)
      },
    }
  }
}


