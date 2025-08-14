'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { useWorkspaceStore } from '@/lib/store'
import { getDataProvider } from '@/lib/data/providers'
import { portfolioReturns, historicalVaR, expectedShortfall, cornishFisherVaR, calculateReturns } from '@/lib/quant/risk'

type Position = { symbol: string; weight: number }

export function PortfolioRiskWidget({ positions, confidence = 0.95, horizonDays = 1 }: { positions: Position[]; confidence?: number; horizonDays?: number }) {
  const providerId = useWorkspaceStore(s => s.dataProvider)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<{ varHist: number; esHist: number; varCF: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const provider = getDataProvider()
        if (!provider) throw new Error('No data provider')
        const symbols = positions.map(p => p.symbol.toUpperCase())
        // Fetch recent prices per symbol
        const series: Record<string, number[]> = {}
        await Promise.all(symbols.map(async (s) => {
          const prices = await provider.getPrices(s, '6M')
          series[s] = prices.map(p => Number(p.close)).filter(Number.isFinite)
        }))
        const weights: Record<string, number> = {}
        positions.forEach(p => { weights[p.symbol.toUpperCase()] = p.weight })
        const r = portfolioReturns(series, weights, 'log')
        // Scale to horizon by sqrt(T) approximation
        const scale = Math.max(1, Math.sqrt(horizonDays))
        const scaled = r.map(x => x * scale)
        const varHist = historicalVaR(scaled, confidence)
        const esHist = expectedShortfall(scaled, confidence)
        const varCF = cornishFisherVaR(scaled, confidence)
        if (!cancelled) setMetrics({ varHist, esHist, varCF })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [positions.map(p => `${p.symbol}:${p.weight}`).join(','), confidence, horizonDays, providerId])

  return (
    <Card className="p-3">
      <div className="font-medium">Portfolio Risk</div>
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      {metrics && (
        <div className="mt-2 text-sm grid grid-cols-3 gap-3">
          <div><div className="text-muted-foreground">VaR95 (hist)</div><div className="font-mono">{(metrics.varHist*100).toFixed(2)}%</div></div>
          <div><div className="text-muted-foreground">ES95</div><div className="font-mono">{(metrics.esHist*100).toFixed(2)}%</div></div>
          <div><div className="text-muted-foreground">VaR95 (CF)</div><div className="font-mono">{(metrics.varCF*100).toFixed(2)}%</div></div>
        </div>
      )}
    </Card>
  )
}

export const PortfolioRiskDefinition = {
  meta: {
    type: 'portfolio-risk',
    name: 'Portfolio Risk',
    description: 'Portfolio VaR/ES and stress summary',
    category: 'risk',
  },
  runtime: {
    component: PortfolioRiskWidget,
    initialProps: {
      positions: [
        { symbol: 'AAPL', weight: 0.5 },
        { symbol: 'MSFT', weight: 0.5 },
      ],
      confidence: 0.95,
      horizonDays: 1,
    },
  },
}


