import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const metricsPath = path.join(root, 'packages/madlab-core/METRICS.json')
const coveragePath = path.join(root, 'coverage/coverage-summary.json')
const esmPath = path.join(root, 'packages/madlab-core/dist/index.js')

const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'))
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
const coveragePct = coverage.total?.lines?.pct ?? 0
const esmBytes = fs.statSync(esmPath).size

if (coveragePct < 90) {
  console.error(`Coverage too low: ${coveragePct}% < 90%`)
  process.exit(1)
}

if (!metrics.compute?.dcfMs?.p95 || !metrics.compute?.epvMs?.p95) {
  console.error('Missing perf metrics (p95) in METRICS.json')
  process.exit(1)
}

console.log(`Core coverage: ${coveragePct}% | ESM size: ${esmBytes} bytes`)


