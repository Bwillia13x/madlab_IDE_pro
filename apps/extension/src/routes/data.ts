import type { RouteHandler } from './types';
import { fetchPrices, fetchQuote, fetchKpis, fetchFinancials, fetchVol } from '../data-adapters/mock';
import { fetchAlphaVantageKpis, fetchAlphaVantagePrices, fetchAlphaVantageFinancials } from '../data-adapters/alphaVantage';

export const dataRoutes: Record<string, RouteHandler> = {
  'data:quote': async (msg, panel) => {
    const { symbol } = msg.payload as any;
    const data = await fetchQuote(symbol);
    panel.webview.postMessage({ type: 'data:quote', payload: data });
  },
  'data:prices': async (msg, panel, context) => {
    const { symbol, range = '6M' } = msg.payload as any;
    try {
      const data = await fetchAlphaVantagePrices(context, symbol, range);
      panel.webview.postMessage({ type: 'data:prices', payload: data });
    } catch (e) {
      const data = await fetchPrices(symbol, range);
      panel.webview.postMessage({ type: 'data:prices', payload: data });
    }
  },
  'data:kpis': async (msg, panel, context) => {
    const { symbol } = msg.payload as any;
    try {
      const data = await fetchAlphaVantageKpis(context, symbol);
      panel.webview.postMessage({ type: 'data:kpis', payload: data });
    } catch (e) {
      const data = await fetchKpis(symbol);
      panel.webview.postMessage({ type: 'data:kpis', payload: data });
    }
  },
  'data:financials': async (msg, panel, context) => {
    const { symbol } = msg.payload as any;
    try {
      const data = await fetchAlphaVantageFinancials(context, symbol);
      panel.webview.postMessage({ type: 'data:financials', payload: data });
    } catch (e) {
      const data = await fetchFinancials(symbol);
      panel.webview.postMessage({ type: 'data:financials', payload: data });
    }
  },
  'data:vol': async (msg, panel) => {
    const { symbol } = msg.payload as any;
    const data = await fetchVol(symbol);
    panel.webview.postMessage({ type: 'data:vol', payload: data });
  },
};


