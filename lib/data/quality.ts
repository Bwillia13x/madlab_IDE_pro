export type DataQualityIssue = {
  kind: 'outlier' | 'gap' | 'negative' | 'stale'
  index?: number
  message: string
}

export function detectOutliers(values: number[], zThreshold = 4): DataQualityIssue[] {
  if (!Array.isArray(values) || values.length < 3) return []
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (values.length - 1)
  const sd = Math.sqrt(Math.max(variance, 0))
  if (sd === 0) return []
  const issues: DataQualityIssue[] = []
  values.forEach((v, i) => {
    const z = Math.abs((v - mean) / sd)
    if (z > zThreshold) issues.push({ kind: 'outlier', index: i, message: `Z-score ${z.toFixed(2)} > ${zThreshold}` })
  })
  return issues
}

export function detectGaps(dates: Date[], maxGapDays = 5): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  for (let i = 1; i < dates.length; i++) {
    const gapDays = (dates[i].getTime() - dates[i - 1].getTime()) / (86400_000)
    if (gapDays > maxGapDays) issues.push({ kind: 'gap', index: i, message: `Gap ${gapDays.toFixed(1)} days` })
  }
  return issues
}

export function detectNegative(values: number[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  values.forEach((v, i) => { if (v < 0) issues.push({ kind: 'negative', index: i, message: 'Negative value' }) })
  return issues
}

export function isMarketOpen(now: Date = new Date(), tzOffsetMinutes?: number): boolean {
  // Simple US market hours: Mon-Fri, 9:30-16:00 ET; if tz offset given, adjust
  const d = new Date(now)
  if (typeof tzOffsetMinutes === 'number') {
    d.setMinutes(d.getMinutes() + tzOffsetMinutes)
  }
  const day = d.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = d.getUTCHours()
  const min = d.getUTCMinutes()
  const total = hour * 60 + min
  // 9:30 ET (14:30 UTC during EST/EDT varies; this is a simplification)
  const openUtc = 14 * 60 + 30
  const closeUtc = 21 * 60 // 16:00 ET ~ 20:00/21:00 UTC; use 21:00 as lenient
  return total >= openUtc && total <= closeUtc
}


