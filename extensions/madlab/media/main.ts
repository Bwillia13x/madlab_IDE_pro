declare const acquireVsCodeApi: () => { postMessage: (m: unknown) => void };
const vscode = acquireVsCodeApi();

type DcfInput = { fcf0:number; growth:number; wacc:number; horizon:number; terminalMultiple:number; shares:number };

const app = document.getElementById('app')!;

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

const formRow1 = document.createElement('div'); formRow1.className = 'row';
formRow1.append(fcf0.wrapper, growth.wrapper, wacc.wrapper);
const formRow2 = document.createElement('div'); formRow2.className = 'row';
formRow2.append(horizon.wrapper, terminalMultiple.wrapper, shares.wrapper);

const calcBtn = document.createElement('button'); calcBtn.textContent = 'Calculate'; calcBtn.addEventListener('click', () => {
  const payload: DcfInput = {
    fcf0: Number(fcf0.input.value),
    growth: Number(growth.input.value),
    wacc: Number(wacc.input.value),
    horizon: Number(horizon.input.value),
    terminalMultiple: Number(terminalMultiple.input.value),
    shares: Number(shares.input.value)
  };
  vscode.postMessage({ type: 'CALC', payload });
});

const result = document.createElement('div'); result.className = 'result';

app.append(formRow1, formRow2, calcBtn, result);

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message) return;
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
  }
});


