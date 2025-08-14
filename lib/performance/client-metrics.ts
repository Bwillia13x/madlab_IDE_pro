/**
 * Lightweight client-side metrics collector for quick in-app visibility
 */

type MetricSample = number

class RingBuffer {
  private buffer: MetricSample[] = []
  private capacity: number

  constructor(capacity: number) {
    this.capacity = Math.max(10, capacity)
  }

  push(value: MetricSample) {
    this.buffer.push(value)
    if (this.buffer.length > this.capacity) {
      this.buffer.shift()
    }
  }

  values(): MetricSample[] {
    return [...this.buffer]
  }
}

class ClientMetrics {
  private series = new Map<string, RingBuffer>()

  record(name: string, value: number) {
    if (!Number.isFinite(value)) return
    if (!this.series.has(name)) {
      this.series.set(name, new RingBuffer(200))
    }
    this.series.get(name)!.push(value)
  }

  summary(name: string): { count: number; avg: number; p50: number; p90: number; p99: number } {
    const vals = this.series.get(name)?.values() || []
    if (vals.length === 0) {
      return { count: 0, avg: 0, p50: 0, p90: 0, p99: 0 }
    }
    const sorted = [...vals].sort((a, b) => a - b)
    const avg = sorted.reduce((s, n) => s + n, 0) / sorted.length
    const pct = (p: number) => {
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
      return sorted[idx]
    }
    return {
      count: sorted.length,
      avg,
      p50: pct(0.5),
      p90: pct(0.9),
      p99: pct(0.99),
    }
  }

  getValues(name: string): number[] {
    return this.series.get(name)?.values() || []
  }
}

export const clientMetrics = new ClientMetrics()

export function recordStreamingLatencyMs(latencyMs: number) {
  clientMetrics.record('stream_latency_ms', latencyMs)
}

export function getStreamingLatencySummary() {
  return clientMetrics.summary('stream_latency_ms')
}

export function getStreamingLatencySeries() {
  return clientMetrics.getValues('stream_latency_ms')
}


