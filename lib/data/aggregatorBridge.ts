import { multiExchangeAggregator } from './multiExchangeAggregator';
import { highFrequencyHandler } from './highFrequencyHandler';

const FEATURE_HFT = String(process.env.NEXT_PUBLIC_FEATURE_HFT || '').toLowerCase() === 'true';

let active = false;
let unsub: (() => void) | null = null;

export function startAggregatorBridge(): void {
  if (!FEATURE_HFT || active) return;
  active = true;
  const onAggregated = (agg: { symbol: string; midPrice: number; totalVolume: number; lastUpdate: number }) => {
    try {
      highFrequencyHandler.addDataPoint({
        symbol: agg.symbol,
        timestamp: agg.lastUpdate || Date.now(),
        price: Number(agg.midPrice) || 0,
        volume: Number(agg.totalVolume) || 0,
      });
    } catch {}
  };
  // @ts-ignore - event name exists in aggregator
  multiExchangeAggregator.on('aggregatedDataUpdate', onAggregated);
  unsub = () => {
    // @ts-ignore
    multiExchangeAggregator.off('aggregatedDataUpdate', onAggregated);
    active = false;
  };
}

export function stopAggregatorBridge(): void {
  if (unsub) {
    try { unsub(); } catch {}
    unsub = null;
  }
  active = false;
}

