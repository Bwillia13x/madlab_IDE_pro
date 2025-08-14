import type { ToolCall } from '@/lib/agent/tools'

declare global {
  interface Window {
    madlabBridge?: {
      request?: <T>(method: string, params?: unknown) => Promise<T>
    }
  }
}

export async function isLlmAvailable(): Promise<boolean> {
  try {
    const req = window?.madlabBridge?.request
    if (typeof req !== 'function') return false
    const ok = await req<boolean>('llm:available')
    return Boolean(ok)
  } catch {
    return false
  }
}

export async function tryLlmPlan(userText: string): Promise<ToolCall | null> {
  try {
    const req = window?.madlabBridge?.request as undefined | (<T>(m: string, p?: unknown) => Promise<T>)
    if (!req) return null
    const plan = await req<{ name?: string; args?: Record<string, unknown> }>('agent:plan', { text: userText })
    if (plan && typeof plan.name === 'string' && plan.args && typeof plan.args === 'object') {
      return { name: plan.name as ToolCall['name'], args: plan.args }
    }
    return null
  } catch {
    return null
  }
}


