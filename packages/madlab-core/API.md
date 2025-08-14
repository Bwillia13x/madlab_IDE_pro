# @madlab/core API

Stable entrypoints for MadLab Studio POC.

## Install (workspace)

- Require: `require('@madlab/core')`
- Import: `import { dcf, epv } from '@madlab/core'`
- Schemas: `import { DcfInputSchema, EpvInputSchema } from '@madlab/core/schemas'`
- Adapters: `import { computeDcf, computeEpv } from '@madlab/core/adapters'`

## Signatures

```ts
export interface DcfInput {
  fcf0: number;
  growth: number;
  wacc: number;
  horizon: number;
  terminalMultiple: number;
  shares: number;
}
export interface DcfResult {
  equityValue: number;
  perShare: number;
  breakdown: { pvStage: number; pvTerminal: number };
}
export function dcf(input: DcfInput): DcfResult;

export interface EpvInput {
  ebit: number;
  taxRate: number;
  reinvestmentRate: number;
  wacc: number;
  shares: number;
}
export interface EpvResult {
  epv: number;
  perShare: number;
}
export function epv(input: EpvInput): EpvResult;
```

Schemas (Zod):

- `@madlab/core/schemas` → `DcfInputSchema`, `EpvInputSchema`

## Minimal usage

CommonJS:

```js
const { dcf } = require('@madlab/core');
const { DcfInputSchema } = require('@madlab/core/schemas');

const input = { fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 12, shares: 50 };
const parsed = DcfInputSchema.parse(input);
console.log(dcf(parsed));
```

ESM:

```js
import { dcf } from '@madlab/core';
import { DcfInputSchema } from '@madlab/core/schemas';

const input = { fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 12, shares: 50 };
const parsed = DcfInputSchema.parse(input);
console.log(dcf(parsed));
```

Precision: calculations use JS doubles. Do not round in core; round at UI display. Consider decimal.js for heavier scenarios.

Determinism tolerance: `expectClose(actual, expected, rel=1e-9, abs=1e-9)` in tests.

Adapter error shape (normalized):

```ts
type ComputeError = { issues: { path: string; msg: string }[] };
// Example: { ok: false, error: { issues: [{ path: 'wacc', msg: 'wacc must be < 1' }] } }
```
