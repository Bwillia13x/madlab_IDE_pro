declare const acquireVsCodeApi: () => { postMessage: (m: unknown) => void };
const vscode = acquireVsCodeApi();

type InitMsg = { type: 'INIT'; payload?: { defaultModel?: any; version?: string } };
type LoadModelMsg = { type: 'LOAD_MODEL'; payload: any };
type CalcMsg = { type: 'CALC'; payload: DcfInput };
type ResultMsg = {
  type: 'RESULT';
  payload: {
    equityValue: number;
    perShare: number;
    breakdown: { pvStage: number; pvTerminal: number };
  };
};
type ErrorMsg = { type: 'ERROR'; error: string };
type AnyMsg = InitMsg | LoadModelMsg | CalcMsg | ResultMsg | ErrorMsg | { type: string };

type DcfInput = {
  fcf0: number;
  growth: number;
  wacc: number;
  horizon: number;
  terminalMultiple: number;
  shares: number;
};

const t0 = performance.now();
const app =
  document.getElementById('app') ||
  (function () {
    const n = document.createElement('div');
    n.id = 'app';
    document.body.appendChild(n);
    return n;
  })();

function createInput(id: string, labelText: string, step = 'any', value = '') {
  const wrapper = document.createElement('label');
  wrapper.htmlFor = id;
  const label = document.createElement('span');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.id = id;
  input.type = 'number';
  input.step = step;
  input.value = value;
  input.setAttribute('aria-label', labelText);
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return { wrapper, input };
}

const fcf0 = createInput('fcf0', 'FCF0', '0.01');
const growth = createInput('growth', 'Growth (e.g., 0.03)', '0.001');
const wacc = createInput('wacc', 'WACC (e.g., 0.1)', '0.001');
const horizon = createInput('horizon', 'Horizon (years)', '1');
const terminalMultiple = createInput('terminalMultiple', 'Terminal Multiple', '0.1');
const shares = createInput('shares', 'Shares (MM)', '1');

const formRow1 = document.createElement('div');
formRow1.className = 'row';
formRow1.append(fcf0.wrapper, growth.wrapper, wacc.wrapper);
const formRow2 = document.createElement('div');
formRow2.className = 'row';
formRow2.append(horizon.wrapper, terminalMultiple.wrapper, shares.wrapper);

const hint = document.createElement('div');
hint.setAttribute('aria-live', 'polite');
hint.style.color = 'var(--vscode-inputValidation-errorBorder, #ef4444)';
hint.style.minHeight = '1.2em';

function validate(): { ok: boolean; payload?: DcfInput; focusId?: string; message?: string } {
  const vals: Record<string, number> = {
    fcf0: Number(fcf0.input.value),
    growth: Number(growth.input.value),
    wacc: Number(wacc.input.value),
    horizon: Number(horizon.input.value),
    terminalMultiple: Number(terminalMultiple.input.value),
    shares: Number(shares.input.value),
  };
  // basic guards
  if (!isFinite(vals.fcf0)) return { ok: false, focusId: 'fcf0', message: 'FCF0 must be a number' };
  if (!isFinite(vals.growth))
    return { ok: false, focusId: 'growth', message: 'Growth must be a number' };
  if (!(vals.wacc > 0)) return { ok: false, focusId: 'wacc', message: 'WACC must be > 0' };
  if (!(vals.horizon > 0)) return { ok: false, focusId: 'horizon', message: 'Horizon must be > 0' };
  if (!(vals.terminalMultiple > 0))
    return { ok: false, focusId: 'terminalMultiple', message: 'Terminal Multiple must be > 0' };
  if (!(vals.shares > 0)) return { ok: false, focusId: 'shares', message: 'Shares must be > 0' };
  return { ok: true, payload: vals as unknown as DcfInput };
}

function setInvalid(input: HTMLInputElement, invalid: boolean, message?: string) {
  input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  hint.textContent = invalid ? message || '' : '';
}

const calcBtn = document.createElement('button');
calcBtn.textContent = 'Calculate';
calcBtn.addEventListener('click', () => {
  const v = validate();
  // reset invalids
  [fcf0, growth, wacc, horizon, terminalMultiple, shares].forEach(({ input }) =>
    setInvalid(input, false)
  );
  if (!v.ok) {
    const el = document.getElementById(v.focusId!) as HTMLInputElement | null;
    if (el) {
      setInvalid(el, true, v.message);
      el.focus();
    }
    return;
  }
  vscode.postMessage({ type: 'CALC', payload: { method: 'dcf', model: v.payload } });
});

const result = document.createElement('div');
result.className = 'result';
result.setAttribute('role', 'status');

// Copy metrics button (optional helper)
const copyBtn = document.createElement('button');
copyBtn.textContent = 'Copy metrics';
copyBtn.addEventListener('click', async () => {
  try {
    const data = JSON.stringify((window as any).__madlab_metrics || {}, null, 2);
    await navigator.clipboard.writeText(data);
    console.log('[MadLab] metrics copied');
    hint.textContent = 'Metrics copied to clipboard.';
  } catch (err) {
    console.warn('[madlab] clipboard write failed', err);
    hint.textContent = 'Unable to copy metrics. Please open DevTools > Console and copy manually.';
  }
});

app.append(formRow1, formRow2, calcBtn, copyBtn, hint, result);
// initial render metric
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__madlab_metrics = { initialRenderMs: performance.now() - t0 };
console.log(
  '[MadLab] initialRenderMs',
  (window as any).__madlab_metrics.initialRenderMs.toFixed(2)
);

let recomputeSamples: number[] = [];
window.addEventListener('message', (event) => {
  const message: AnyMsg = event.data;
  if (!message || typeof message !== 'object' || typeof (message as any).type !== 'string') {
    console.warn('[MadLab] Unknown message', message);
    return;
  }
  switch (message.type) {
    case 'INIT': {
      const m = message.payload?.defaultModel;
      if (m) {
        fcf0.input.value = String(m.fcf0);
        growth.input.value = String(m.growth);
        wacc.input.value = String(m.wacc);
        horizon.input.value = String(m.horizon);
        terminalMultiple.input.value = String(m.terminalMultiple);
        shares.input.value = String(m.shares);
      }
      break;
    }
    case 'RESULT': {
      const r = message.payload;
      result.textContent = `Equity: ${r.equityValue.toFixed(2)} | Per Share: ${r.perShare.toFixed(2)} (Stage: ${r.breakdown.pvStage.toFixed(2)}, Terminal: ${r.breakdown.pvTerminal.toFixed(2)})`;
      if (recomputeSamples.length > 0) {
        const p50 = recomputeSamples.slice().sort((a, b) => a - b)[
          Math.floor(recomputeSamples.length * 0.5)
        ];
        const p95 = recomputeSamples.slice().sort((a, b) => a - b)[
          Math.floor(recomputeSamples.length * 0.95)
        ];
        console.log('[MadLab] recompute p50/p95 (ms)', p50.toFixed(2), p95.toFixed(2));
      }
      break;
    }
    case 'ERROR': {
      result.textContent = `Error: ${message.error}`;
      break;
    }
    case 'LOAD_MODEL': {
      const m = message.payload;
      if (m) {
        fcf0.input.value = String(m.fcf0);
        growth.input.value = String(m.growth);
        wacc.input.value = String(m.wacc);
        horizon.input.value = String(m.horizon);
        terminalMultiple.input.value = String(m.terminalMultiple);
        shares.input.value = String(m.shares);
      }
      break;
    }
    default:
      console.warn('[MadLab] Unhandled message type', (message as any).type);
  }
});

// probe: run 50 quick recomputes to measure round-trip
setTimeout(() => {
  const runs = 50;
  let done = 0;
  recomputeSamples = [];
  const tStart = performance.now();
  const computeOnce = () => {
    const t = performance.now();
    const payload: DcfInput = {
      fcf0: Number(fcf0.input.value),
      growth: Number(growth.input.value),
      wacc: Number(wacc.input.value),
      horizon: Number(horizon.input.value),
      terminalMultiple: Number(terminalMultiple.input.value),
      shares: Number(shares.input.value),
    };
    const before = performance.now();
    vscode.postMessage({ type: 'CALC', payload: { method: 'dcf', model: payload } });
    const handle = (ev: MessageEvent) => {
      const m = ev.data as AnyMsg;
      if (m && m.type === 'RESULT') {
        recomputeSamples.push(performance.now() - before);
        window.removeEventListener('message', handle as any);
        done++;
        if (done < runs) {
          computeOnce();
        } else {
          const sorted = recomputeSamples.slice().sort((a, b) => a - b);
          const p50 = sorted[Math.floor(sorted.length * 0.5)];
          const p95 = sorted[Math.floor(sorted.length * 0.95)];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__madlab_metrics = {
            ...(window as any).__madlab_metrics,
            recomputeMs: { p50, p95 },
          };
        }
      }
    };
    window.addEventListener('message', handle as any);
  };
  computeOnce();
}, 50);
