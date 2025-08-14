// Web Worker for VaR/ES bootstrap to avoid blocking UI
// Note: Placed in public to be fetched as a classic worker

type MessageIn = {
  type: 'bootstrap',
  returns: number[],
  confidence: number,
  samples?: number,
}

type MessageOut = {
  type: 'result',
  data: any,
} | {
  type: 'error',
  message: string,
}

function mean(arr: number[]) {
  let s = 0
  for (let i = 0; i < arr.length; i++) s += arr[i]
  return s / arr.length
}

function quantile(arr: number[], p: number) {
  const a = [...arr].sort((x, y) => x - y)
  const rank = (a.length - 1) * p
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) return a[lo]
  const w = rank - lo
  return a[lo] * (1 - w) + a[hi] * w
}

function historicalVaR(returns: number[], confidence: number): number {
  const alpha = Math.max(0, Math.min(1, 1 - confidence))
  const q = quantile(returns, alpha)
  return -q
}

function expectedShortfall(returns: number[], confidence: number): number {
  const alpha = Math.max(0, Math.min(1, 1 - confidence))
  const q = quantile(returns, alpha)
  const tail = returns.filter(r => r <= q)
  if (tail.length === 0) return -q
  return -mean(tail)
}

function bootstrapVaREs(returns: number[], confidence: number, samples: number) {
  const n = returns.length
  const valsVar: number[] = []
  const valsEs: number[] = []
  for (let s = 0; s < samples; s++) {
    const idxs = Array.from({ length: n }, () => Math.floor(Math.random() * n))
    const boot = idxs.map(i => returns[i])
    valsVar.push(historicalVaR(boot, confidence))
    valsEs.push(expectedShortfall(boot, confidence))
  }
  const pct = (arr: number[], p: number) => quantile(arr, p)
  return {
    varHist: historicalVaR(returns, confidence),
    esHist: expectedShortfall(returns, confidence),
    ci: {
      varHist: [pct(valsVar, 0.05), pct(valsVar, 0.95)] as [number, number],
      esHist: [pct(valsEs, 0.05), pct(valsEs, 0.95)] as [number, number],
    }
  }
}

self.onmessage = (e: MessageEvent<MessageIn>) => {
  try {
    const { type, returns, confidence, samples = 500 } = e.data
    if (type !== 'bootstrap') return
    if (!Array.isArray(returns) || returns.length < 2) {
      const out: MessageOut = { type: 'error', message: 'Insufficient returns' }
      ;(self as any).postMessage(out)
      return
    }
    const data = bootstrapVaREs(returns, confidence, samples)
    const out: MessageOut = { type: 'result', data }
    ;(self as any).postMessage(out)
  } catch (err) {
    const out: MessageOut = { type: 'error', message: err instanceof Error ? err.message : 'Worker error' }
    ;(self as any).postMessage(out)
  }
}


