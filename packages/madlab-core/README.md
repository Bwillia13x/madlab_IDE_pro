# @madlab/core

Pure TypeScript finance core for MadLab Studio with deterministic DCF and EPV calculations, CSP-safe HTML helper for VS Code Webviews, and optional zod schemas.

## API

```ts
export interface DcfInput { fcf0:number; growth:number; wacc:number; horizon:number; terminalMultiple:number; shares:number; }
export interface DcfResult { equityValue:number; perShare:number; breakdown:{pvStage:number; pvTerminal:number}; }
export function dcf(input:DcfInput): DcfResult;

export interface EpvInput { ebit:number; taxRate:number; reinvestmentRate:number; wacc:number; shares:number; }
export interface EpvResult { epv:number; perShare:number; }
export function epv(input:EpvInput): EpvResult;
```

- Throws `InputValidationError` on invalid values.
- `buildCspHtml` generates a CSP-safe HTML scaffold for Webviews.

## Build & Test

```bash
pnpm -w --filter @madlab/core build
pnpm -w --filter @madlab/core test
```


