// Lazy setup to avoid requiring prisma client when DB mode is off in tests/dev
import type { PrismaClient as PrismaClientType } from '@prisma/client'
import type { MockPrisma } from './mock'

// Minimal API surface used by our code, to provide a stable type for both real and mock clients
export type PrismaApi = {
  template: {
    findMany: (args?: unknown) => Promise<Array<{ id: string; name: string; kind: string; title: string; widgets: unknown; updatedAt?: Date }>>
    upsert: (args: unknown) => Promise<{ id: string; name: string; kind: string; title: string; widgets: unknown }>
    delete: (args: unknown) => Promise<void>
    findUnique: (args: unknown) => Promise<{ id: string; name: string; kind: string; title: string; widgets: unknown } | null>
  }
  workspace: {
    findMany: (args?: unknown) => Promise<Array<{ id: string; title: string; data: unknown; updatedAt?: Date }>>
    findUnique: (args: unknown) => Promise<{ id: string; title: string; data: unknown } | null>
    create: (args: unknown) => Promise<{ id: string; title: string; data: unknown }>
    update: (args: unknown) => Promise<{ id: string; title: string; data: unknown }>
    delete: (args: unknown) => Promise<void>
  }
}

type PrismaLike = PrismaClientType | MockPrisma

let prismaInstance: PrismaLike | undefined

export const prisma = new Proxy({}, {
	get: (_target, prop: string) => {
		if (!prismaInstance) {
			try {
				// Decide whether to use real Prisma client
				const isDbMode = typeof process !== 'undefined' && (process as unknown as { env?: Record<string, unknown> }).env?.NEXT_PUBLIC_DB_MODE === 'db'
				const hasDatasource = !!(process as unknown as { env?: Record<string, unknown> }).env?.DATABASE_URL
				if (isDbMode && hasDatasource) {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => PrismaClientType }
					prismaInstance = new PrismaClient()
				} else {
					throw new Error('DB mode disabled or datasource not configured')
				}
			} catch {
				// Fallback to in-memory mock when Prisma client is not generated/installed
				const { createMockPrisma } = require('./mock') as { createMockPrisma: () => MockPrisma }
				prismaInstance = createMockPrisma()
			}
		}
    		return (prismaInstance as unknown as Record<string, unknown>)[prop as unknown as string]
	}
}) as unknown as PrismaApi


