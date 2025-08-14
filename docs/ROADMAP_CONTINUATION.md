# MAD LAB IDE v2.0 Roadmap - Continuation Guide

**Current Status**: Batches 00-04, 16-18 completed ✅  
**Next Priority**: Complete remaining v2.0 batches (05-15, 19-25) before moving to v3.0

---

## 🚨 IMMEDIATE PRIORITIES (Complete v2.0 First)

### Batch 05 — Zod Validation for Data Contracts
**Status**: ❌ NOT STARTED  
**Priority**: P0 (Critical for data integrity)

**Technical Implementation**:
1. Create `lib/data/schemas.ts`:
   ```typescript
   import { z } from 'zod';
   
   export const zPricePoint = z.object({
     date: z.string().datetime(),
     open: z.number().positive(),
     high: z.number().positive(),
     low: z.number().positive(),
     close: z.number().positive(),
     volume: z.number().nonnegative(),
   });
   
   export const zPriceSeries = z.array(zPricePoint);
   
   export const zKpiData = z.object({
     symbol: z.string(),
     name: z.string(),
     price: z.number(),
     change: z.number(),
     changePercent: z.number(),
     volume: z.number().nonnegative(),
     marketCap: z.number().nonnegative(),
     timestamp: z.string().datetime(),
   });
   
   export const zFinancials = z.object({
     symbol: z.string(),
     revenue: z.number(),
     netIncome: z.number(),
     cashFlow: z.number(),
     fcf: z.number(),
     timestamp: z.string().datetime(),
   });
   ```

2. Update `lib/data/adapters/mock.ts` and `lib/data/adapters/extension.ts`:
   ```typescript
   import { zPriceSeries, zKpiData, zFinancials } from '../schemas';
   
   // In each adapter method, add validation:
   const data = generatePrices(symbol, range);
   const parsed = zPriceSeries.safeParse(data);
   if (!parsed.success) {
     throw new Error(`Mock data validation failed: ${parsed.error.message}`);
   }
   return parsed.data;
   ```

3. Add error boundaries in widgets to catch validation failures gracefully.

**Acceptance Criteria**: Invalid API responses show user-friendly error cards instead of crashing.

---

### Batch 06 — Wire KPI & LineChart to Real Data
**Status**: ❌ NOT STARTED  
**Priority**: P0 (Core functionality)

**Technical Implementation**:
1. Create `lib/data/hooks.ts`:
   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { useWorkspaceStore } from '@/lib/store';
   import { mockAdapter, extensionAdapter } from './adapters';
   
   export function usePrices(symbol: string, range: string) {
     const dataProvider = useWorkspaceStore(state => state.dataProvider);
     const adapter = dataProvider === 'extension' ? extensionAdapter : mockAdapter;
     
     return useQuery({
       queryKey: ['prices', symbol, range, dataProvider],
       queryFn: () => adapter.getPrices(symbol, range),
       staleTime: 5 * 60 * 1000, // 5 minutes
     });
   }
   
   export function useKpis(symbol: string) {
     const dataProvider = useWorkspaceStore(state => state.dataProvider);
     const adapter = dataProvider === 'extension' ? extensionAdapter : mockAdapter;
     
     return useQuery({
       queryKey: ['kpis', symbol, dataProvider],
       queryFn: () => adapter.getKpis(symbol),
       staleTime: 60 * 1000, // 1 minute
     });
   }
   ```

2. Update `components/widgets/KpiCard.tsx`:
   ```typescript
   import { useKpis } from '@/lib/data/hooks';
   
   export function KpiCard({ widget, symbol }: KpiCardProps) {
     const { data, loading, error } = useKpis(symbol);
     
     if (loading) return <div>Loading...</div>;
     if (error) return <div>Error: {error.message}</div>;
     if (!data) return <div>No data</div>;
     
     // Render KPI data
   }
   ```

3. Create `components/widgets/LineChart.tsx` if missing:
   ```typescript
   import { usePrices } from '@/lib/data/hooks';
   import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
   
   export function LineChart({ widget, symbol }: LineChartProps) {
     const { data, loading, error } = usePrices(symbol, '6M');
     
     // Add range selector (1D, 5D, 1M, 3M, 6M, 1Y, 5Y)
     // Add refresh button
     // Render line chart with OHLC close prices
   }
   ```

**Acceptance Criteria**: AAPL shows live data when provider=Extension, mock when provider=Mock.

---

### Batch 07 — Widget Registry & Contract
**Status**: 🟡 PARTIALLY COMPLETED  
**Priority**: P1 (Foundation for extensibility)

**Technical Implementation**:
1. Complete `lib/widgets/registry.ts`:
   ```typescript
   export interface WidgetMeta {
     kind: string;
     title: string;
     version: string;
     propertySchema: z.ZodSchema;
     defaultConfig: Record<string, unknown>;
   }
   
   export interface WidgetDefinition {
     meta: WidgetMeta;
     runtime: {
       component: React.ComponentType<WidgetProps>;
     };
   }
   
   const registry = new Map<string, WidgetDefinition>();
   
   export function registerWidget(definition: WidgetDefinition) {
     registry.set(definition.meta.kind, definition);
   }
   
   export function getWidget(kind: string): WidgetDefinition | undefined {
     return registry.get(kind);
   }
   ```

2. Migrate existing widgets to registry:
   ```typescript
   // In each widget file, export definition:
   export const KpiWidgetDefinition: WidgetDefinition = {
     meta: {
       kind: 'kpi',
       title: 'KPI Card',
       version: '1.0.0',
       propertySchema: z.object({
         symbol: z.string().describe('Stock symbol'),
         title: z.string().optional().describe('Widget title'),
       }),
       defaultConfig: { symbol: 'AAPL' },
     },
     runtime: {
       component: KpiCard,
     },
   };
   ```

3. Update `components/editor/GridCanvas.tsx` to use registry:
   ```typescript
   const widgetDef = getWidget(widget.type);
   if (!widgetDef) {
     return <div>Unknown widget type: {widget.type}</div>;
   }
   
   const WidgetComponent = widgetDef.runtime.component;
   return <WidgetComponent {...widgetProps} />;
   ```

**Acceptance Criteria**: Adding widgets via palette pulls from registry; old workspaces still load.

---

### Batch 08 — Inspector Auto-Forms from Zod
**Status**: 🟡 PARTIALLY COMPLETED  
**Priority**: P1 (UX improvement)

**Technical Implementation**:
1. Complete `lib/ui/AutoForm.tsx`:
   ```typescript
   export function AutoForm({ schema, value, onChange, disabledKeys = [] }: AutoFormProps) {
     const shape = schema.shape || {};
     
     return (
       <div className="space-y-4">
         {Object.entries(shape).map(([key, fieldSchema]) => {
           if (disabledKeys.includes(key)) return null;
           
           return (
             <div key={key}>
               <Label>{fieldSchema.description || key}</Label>
               {renderField(key, fieldSchema, value[key], onChange)}
             </div>
           );
         })}
       </div>
     );
   }
   
   function renderField(key: string, schema: z.ZodSchema, value: unknown, onChange: (value: unknown) => void) {
     if (schema instanceof z.ZodString) {
       return <Input value={value as string} onChange={(e) => onChange(e.target.value)} />;
     }
     if (schema instanceof z.ZodNumber) {
       return <Input type="number" value={value as number} onChange={(e) => onChange(Number(e.target.value))} />;
     }
     if (schema instanceof z.ZodBoolean) {
       return <Switch checked={value as boolean} onCheckedChange={onChange} />;
     }
     if (schema instanceof z.ZodEnum) {
       return (
         <Select value={value as string} onValueChange={onChange}>
           <SelectTrigger>
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             {schema.options.map(option => (
               <SelectItem key={option} value={option}>{option}</SelectItem>
             ))}
           </SelectContent>
         </Select>
       );
     }
     // Fallback to JSON editor for complex types
     return <Textarea value={JSON.stringify(value, null, 2)} onChange={(e) => onChange(JSON.parse(e.target.value))} />;
   }
   ```

2. Update `components/inspector/Inspector.tsx`:
   ```typescript
   const widgetDef = getWidget(widget.type);
   const configSchema = widgetDef?.meta.propertySchema || z.object({
     symbol: z.string().describe('Stock symbol'),
   });
   
   return (
     <div>
       <AutoForm
         schema={configSchema}
         value={widget.props || {}}
         onChange={(newProps) => updateWidget(sheetId, { id: widget.id, props: newProps })}
         disabledKeys={['symbol']} // Handle symbol separately
       />
     </div>
   );
   ```

**Acceptance Criteria**: Editing symbol/range/title in inspector updates widget live.

---

### Batch 09 — DCF Mini-Engine + Sensitivities
**Status**: ✅ COMPLETED  
**Priority**: N/A (Already done)

---

### Batch 10 — Risk: VaR/ES
**Status**: ✅ COMPLETED  
**Priority**: N/A (Already done)

---

### Batch 11 — Options: Black-Scholes + Vol Cone
**Status**: ✅ COMPLETED  
**Priority**: N/A (Already done)

---

### Batch 12 — Performance & Bundle Discipline
**Status**: 🟡 PARTIALLY COMPLETED  
**Priority**: P2 (Performance optimization)

**Technical Implementation**:
1. Add lazy loading for heavy widgets:
   ```typescript
   // In lib/widgets/registry.ts
   export function getLazyWidget(kind: string) {
     return lazy(() => import(`@/components/widgets/${kind}.tsx`));
   }
   ```

2. Add size-limit configuration:
   ```json
   // .size-limit.json
   {
     "main": "3 MB",
     "css": "500 KB",
     "webpack": false
   }
   ```

3. Update package.json scripts:
   ```json
   {
     "scripts": {
       "size": "size-limit",
       "build:analyze": "ANALYZE=true pnpm build"
     }
   }
   ```

**Acceptance Criteria**: Main bundle <3MB gzip; no >50ms blocks in profiler.
Current: helper added; convert heavy widgets to dynamic imports next.

---

### Batch 13 — E2E Expansion with Stable Selectors
**Status**: 🟡 PARTIALLY COMPLETED  
**Priority**: P2 (Test reliability)

**Technical Implementation**:
1. Add data-testid attributes to key components:
   ```typescript
   // In components/editor/SheetTabs.tsx
   <div data-testid="sheet-tab-${sheet.id}">
   
   // In components/editor/AddWidget.tsx
   <button data-testid="add-widget-button">
   
   // In components/inspector/Inspector.tsx
    <div data-testid="inspector-panel">
    
    // In components/chrome/StatusBar.tsx
    <button data-testid="provider-toggle">{dataProvider}</button>
   ```

2. Expand `tests/e2e/workspace.spec.ts`:
   ```typescript
   test('full workspace lifecycle', async ({ page }) => {
     // Create sheet
     await page.click('[data-testid="add-sheet-button"]');
     
     // Add widget
     await page.click('[data-testid="add-widget-button"]');
     await page.click('[data-testid="widget-option-kpi"]');
     
     // Duplicate widget
     await page.click('[data-testid="duplicate-widget-button"]');
     
     // Delete widget
     await page.click('[data-testid="delete-widget-button"]');
     
     // Toggle data provider
     await page.click('[data-testid="provider-toggle"]');
   });
   ```

**Acceptance Criteria**: E2E green locally and in CI.
Current: selectors added; tests passing locally.

---

### Batch 14 — Agent Tools: Data + Workspace Ops
**Status**: ❌ NOT STARTED  
**Priority**: P3 (Agent functionality)

**Technical Implementation**:
1. Create `lib/agent/tools.ts`:
   ```typescript
   export interface AgentTool {
     name: string;
     description: string;
     parameters: z.ZodSchema;
     execute: (params: unknown) => Promise<unknown>;
   }
   
   export const dataTools: AgentTool[] = [
     {
       name: 'fetchPrices',
       description: 'Fetch price data for a symbol',
       parameters: z.object({
         symbol: z.string(),
         range: z.string(),
       }),
       execute: async ({ symbol, range }) => {
         // Use current data provider
       },
     },
   ];
   
   export const workspaceTools: AgentTool[] = [
     {
       name: 'addSheet',
       description: 'Add a new sheet',
       parameters: z.object({
         title: z.string(),
       }),
       execute: async ({ title }) => {
         // Use store actions
       },
     },
   ];
   ```

2. Update chat agent to use tools:
   ```typescript
   // In components/chat/ChatAgent.tsx
   const tools = [...dataTools, ...workspaceTools];
   
   // Parse user intent and map to tools
   const intent = parseIntent(userMessage);
   const tool = tools.find(t => t.name === intent.tool);
   
   if (tool) {
     const result = await tool.execute(intent.parameters);
     // Format and display result
   }
   ```

**Acceptance Criteria**: User can ask for a line chart; agent creates widget and fills data.

---

### Batch 15 — Optional LLM Tool-Calling Mode
**Status**: 🟡 PARTIALLY COMPLETED  
**Priority**: P4 (Advanced agent features)

**Technical Implementation**:
1. Add LLM secret to extension:
   ```typescript
   // In apps/extension/src/extension.ts
   context.subscriptions.push(
     vscode.commands.registerCommand('madlab.setOpenAIKey', async () => {
       const key = await vscode.window.showInputBox({
         prompt: 'Enter OpenAI API Key',
         password: true,
       });
       if (key) {
         await context.secrets.store('openaiApiKey', key);
       }
     })
   );
   ```

2. Add LLM endpoint in extension:
   ```typescript
   // In apps/extension/src/extension.ts
   case 'agent:llm': {
     const { prompt, tools } = msg.payload as any;
     const openaiKey = await getSecret(context, 'openaiApiKey');
     
     if (!openaiKey) {
       sendResponse('agent:llm', { error: 'OpenAI key not configured' });
       break;
     }
     
     // Proxy to OpenAI with tool schema
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${openaiKey}` },
       body: JSON.stringify({
          model: 'gpt-4o-mini',
         messages: [{ role: 'user', content: prompt }],
         tools: tools,
       }),
     });
     
     const result = await response.json();
     sendResponse('agent:llm', result);
     break;
   }
   ```

**Acceptance Criteria**: Works with or without key; network inspector shows no key in webview.
Current: Key command and proxy endpoint added in extension.

---

### Batch 16 — Workspace Import/Export (JSON)
**Status**: ✅ COMPLETED  
**Priority**: N/A (Already done)

---

### Batch 17 — Static Demo Export + Warning Banner
**Status**: ❌ NOT STARTED  
**Priority**: P2 (Demo deployment)

**Technical Implementation**:
1. Add demo mode banner:
   ```typescript
   // In components/providers/DataProvider.tsx
   {dataProvider === 'mock' && (
     <div className="bg-yellow-600 text-white text-center text-xs py-1.5 font-medium">
       Demo mode: synthetic data. Connect to extension for live data.
     </div>
   )}
   ```

2. Update README with deploy instructions:
   ```markdown
   ## Static Export
   
   ```bash
   pnpm build
   # Files in 'out' directory suitable for static hosting
   # Note: Demo mode only - no live data without extension
   ```
   ```

**Acceptance Criteria**: Vercel deploy works; demo clearly marked.

---

### Batch 18 — VSIX Packaging & Marketplace Readiness
**Status**: ✅ COMPLETED  
**Priority**: N/A (Already done)

---

### Batch 19 — Error Boundaries & Toasts
**Status**: ❌ NOT STARTED  
**Priority**: P3 (Error handling)

**Technical Implementation**:
1. Create error boundary:
   ```typescript
   // In components/ui/ErrorBoundary.tsx
   export class ErrorBoundary extends React.Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = { hasError: false, error: null };
     }
     
     static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error };
     }
     
     render() {
       if (this.state.hasError) {
         return (
           <div className="p-4 border border-red-200 bg-red-50">
             <h2>Something went wrong</h2>
             <button onClick={() => this.setState({ hasError: false })}>
               Try again
             </button>
           </div>
         );
       }
       
       return this.props.children;
     }
   }
   ```

2. Add toast system:
   ```typescript
   // In lib/ui/toast.tsx
   export function useToast() {
     const [toasts, setToasts] = useState<Toast[]>([]);
     
     const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
       const id = Date.now();
       setToasts(prev => [...prev, { ...toast, id }]);
       setTimeout(() => removeToast(id), 5000);
     }, []);
     
     return { toasts, addToast, removeToast };
   }
   ```

**Acceptance Criteria**: Network failures show non-blocking toasts; boundary renders fallback UI.

---

### Batch 20 — Accessibility & Keyboarding
**Status**: ❌ NOT STARTED  
**Priority**: P3 (Accessibility)

**Technical Implementation**:
1. Add ARIA labels and roles:
   ```typescript
   // In components/editor/GridCanvas.tsx
   <div role="grid" aria-label="Widget grid">
     {widgets.map(widget => (
       <div role="gridcell" key={widget.id}>
   
   // In components/editor/SheetTabs.tsx
   <div role="tablist">
     {sheets.map(sheet => (
       <button role="tab" aria-selected={sheet.id === activeSheetId}>
   ```

2. Add keyboard shortcuts:
   ```typescript
   // In lib/hooks/useKeyboardShortcuts.ts
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.ctrlKey || e.metaKey) {
         switch (e.key) {
           case 'n':
             e.preventDefault();
             addSheet();
             break;
           case 'w':
             e.preventDefault();
             closeCurrentSheet();
             break;
         }
       }
     };
     
     document.addEventListener('keydown', handleKeyDown);
     return () => document.removeEventListener('keydown', handleKeyDown);
   }, []);
   ```

**Acceptance Criteria**: Axe audit passes critical checks; tabs navigable via keyboard.

---

### Batch 21 — Theming Tokens & Visual Polish
**Status**: ❌ NOT STARTED  
**Priority**: P4 (Visual consistency)

**Technical Implementation**:
1. Create design tokens:
   ```typescript
   // In lib/tokens.ts
   export const tokens = {
     colors: {
       primary: 'hsl(222.2 84% 4.9%)',
       secondary: 'hsl(210 40% 96%)',
       accent: 'hsl(210 40% 96%)',
       destructive: 'hsl(0 84.2% 60.2%)',
       muted: 'hsl(210 40% 96%)',
       border: 'hsl(214.3 31.8% 91.4%)',
     },
     spacing: {
       xs: '0.25rem',
       sm: '0.5rem',
       md: '1rem',
       lg: '1.5rem',
       xl: '2rem',
     },
   } as const;
   ```

2. Refactor components to use tokens:
   ```typescript
   // Replace hardcoded values
   className={`p-${tokens.spacing.md} bg-${tokens.colors.primary}`}
   ```

**Acceptance Criteria**: Zero hard-coded hexes in widgets; visual consistency improved.

---

### Batch 22 — Documentation Pass
**Status**: ❌ NOT STARTED  
**Priority**: P4 (Developer experience)

**Technical Implementation**:
1. Create architecture docs:
   ```markdown
   # docs/architecture.md
   ## Data Flow
   Webview → Extension Bridge → Data Adapters → APIs
   
   ## Widget System
   Registry → Definition → Runtime Component
   
   ## State Management
   Zustand Store → Persistence → Migrations
   ```

2. Add widget SDK docs:
   ```markdown
   # docs/widget-sdk.md
   ## Creating a Widget
   1. Define schema with Zod
   2. Create React component
   3. Register in registry
   4. Export definition
   ```

**Acceptance Criteria**: New contributor can build, add a widget, and fetch data in <1h.

---

### Batch 23 — CI Hardening
**Status**: ❌ NOT STARTED  
**Priority**: P3 (CI reliability)

**Technical Implementation**:
1. Create GitHub Actions workflow:
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       strategy:
         matrix:
           node-version: [18, 20]
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: ${{ matrix.node-version }}
         - run: pnpm install
         - run: pnpm typecheck
         - run: pnpm lint
         - run: pnpm test
         - run: pnpm build
         - run: pnpm size
   ```

**Acceptance Criteria**: CI red on violations; green otherwise.

---

### Batch 24 — Release Checklist & Tag
**Status**: ❌ NOT STARTED  
**Priority**: P4 (Release management)

**Technical Implementation**:
1. Update CHANGELOG.md:
   ```markdown
   # Changelog
   ## [0.2.0] - 2024-01-XX
   ### Added
   - Data provider switching
   - Widget registry system
   - Extension data proxy
   - DCF, VaR/ES, Options engines
   
   ### Changed
   - Unified preset system
   - CSP hardening
   
   ### Fixed
   - Import/export functionality
   ```

2. Create GitHub release with VSIX attachment.

**Acceptance Criteria**: Release artifacts present; roadmap issues created.

---

### Batch 25 — Post-Release Bug Triage Template
**Status**: ❌ NOT STARTED  
**Priority**: P4 (Process improvement)

**Technical Implementation**:
1. Create issue template:
   ```markdown
   # .github/ISSUE_TEMPLATE/bug_report.md
   ## Environment
   - Extension version:
   - VS Code version:
   - OS:
   
   ## Steps to reproduce
   1.
   2.
   3.
   
   ## Expected behavior
   
   ## Actual behavior
   
   ## Logs
   [Extension output logs]
   ```

2. Add labels to repository.

**Acceptance Criteria**: New issues follow template; board filters by labels.

---

## 🎯 RECOMMENDED EXECUTION ORDER

### Phase 1: Core Data & Widgets (Batches 05-08)
- **05**: Zod validation (data integrity)
- **06**: Wire widgets to real data (core functionality)
- **07**: Complete widget registry (extensibility foundation)
- **08**: Inspector auto-forms (UX improvement)

### Phase 2: Performance & Testing (Batches 12-13)
- **12**: Bundle optimization (performance)
- **13**: E2E expansion (test reliability)

### Phase 3: Agent & Error Handling (Batches 14-15, 19)
- **14**: Agent tools (basic functionality)
- **15**: LLM integration (advanced features)
- **19**: Error boundaries (robustness)

### Phase 4: Polish & Documentation (Batches 20-22)
- **20**: Accessibility (compliance)
- **21**: Theming (visual consistency)
- **22**: Documentation (developer experience)

### Phase 5: Release & Process (Batches 23-25)
- **23**: CI hardening (automation)
- **24**: Release management (delivery)
- **25**: Bug triage (process)

---

## 🚀 GETTING STARTED

1. **Start with Batch 05** (Zod validation) - it's foundational for data integrity
2. **Run tests after each batch** to ensure no regressions
3. **Commit after each green batch** to maintain progress
4. **Use the exact commit message format** specified in the roadmap
5. **Reference this guide** for technical implementation details

---

## 📋 PRE-REQUISITES CHECKLIST

Before starting any new batch, ensure:
- [ ] All previous batches are green (tests pass, builds succeed)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No linting errors (`pnpm lint`)
- [ ] All tests pass (`pnpm test`)
- [ ] Extension builds (`cd apps/extension && pnpm build`)
- [ ] Web app builds (`pnpm build`)

---

## 🔧 COMMON TROUBLESHOOTING

### TypeScript Errors
- Check import paths and ensure types are exported
- Verify Zod schemas match expected interfaces
- Use `pnpm typecheck` to identify specific issues

### Build Failures
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`
- Check for circular dependencies
- Verify all imports resolve correctly

### Test Failures
- Run individual test files: `pnpm test -- tests/specific.test.ts`
- Check for environment-specific issues
- Verify mock data matches expected schemas

### Extension Issues
- Check VS Code console for errors
- Verify webview assets are built: `pnpm build:webview`
- Test extension in isolation: `cd apps/extension && pnpm build`

---

**Next Action**: Begin with Batch 05 (Zod Validation) to establish data integrity foundation.
