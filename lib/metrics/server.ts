type Counter = {
  name: string
  value: number
}

type TimerSample = {
  name: string
  durations: number[]
}

type MarkWindow = {
  name: string
  // timestamps in ms
  events: number[]
  windowMs: number
}

class ServerMetrics {
  private counters = new Map<string, Counter>()
  private timers = new Map<string, TimerSample>()
  private marks = new Map<string, MarkWindow>()

  inc(name: string, by = 1) {
    const c = this.counters.get(name) || { name, value: 0 }
    c.value += by
    this.counters.set(name, c)
  }

  // mark with default window handled in overload below

  /**
   * Record an instantaneous event occurrence for rate calculations.
   * Maintains a sliding window (default 60s) of timestamps for each metric name.
   */
  mark(name: string, windowMs: number = 60_000) {
    const now = Date.now()
    const m = this.marks.get(name) || { name, events: [], windowMs }
    m.windowMs = windowMs
    m.events.push(now)
    // prune outside window
    const cutoff = now - m.windowMs
    if (m.events.length > 0 && m.events[0] < cutoff) {
      let i = 0
      while (i < m.events.length && m.events[i] < cutoff) i++
      if (i > 0) m.events.splice(0, i)
    }
    this.marks.set(name, m)
  }

  startTimer(name: string) {
    const start = Date.now()
    return {
      stop: (okStatus = 200) => {
        const duration = Date.now() - start
        const t = this.timers.get(name) || { name, durations: [] }
        t.durations.push(duration)
        if (t.durations.length > 200) t.durations.shift()
        this.timers.set(name, t)
        this.inc(`${name}:count`)
        if (okStatus >= 400) this.inc(`${name}:errors`)
        return duration
      }
    }
  }

  snapshot() {
    const timers = Array.from(this.timers.values()).map(t => ({
      name: t.name,
      count: t.durations.length,
      p50: percentile(t.durations, 0.5),
      p90: percentile(t.durations, 0.9),
      p99: percentile(t.durations, 0.99),
      avg: average(t.durations)
    }))
    const counters = Array.from(this.counters.values())
    const rates = Array.from(this.marks.values()).map(m => {
      const now = Date.now()
      const cutoff = now - m.windowMs
      const countInWindow = m.events.filter(ts => ts >= cutoff).length
      const perSec = countInWindow / (m.windowMs / 1000)
      return { name: m.name, perSec, windowSec: m.windowMs / 1000, countInWindow }
    })
    return { timers, counters, rates, ts: Date.now() }
  }

  getCounter(name: string): number {
    return this.counters.get(name)?.value ?? 0
  }

  getRate(name: string): { perSec: number; windowSec: number; countInWindow: number } {
    const m = this.marks.get(name)
    if (!m) return { perSec: 0, windowSec: 60, countInWindow: 0 }
    const now = Date.now()
    const cutoff = now - m.windowMs
    const countInWindow = m.events.filter(ts => ts >= cutoff).length
    const perSec = countInWindow / (m.windowMs / 1000)
    return { perSec, windowSec: m.windowMs / 1000, countInWindow }
  }
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const a = [...arr].sort((x, y) => x - y)
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor((a.length - 1) * p)))
  return a[idx]
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, n) => s + n, 0) / arr.length
}

export const serverMetrics = new ServerMetrics()

export function startServerMetricTimer(name: string) {
  return serverMetrics.startTimer(name)
}


