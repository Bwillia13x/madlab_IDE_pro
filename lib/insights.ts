import { EventEmitter } from 'events';
import { getProvider } from '@/lib/data/providers';

export type Insight = {
  id: string;
  type: 'pattern' | 'risk' | 'opportunity' | 'anomaly' | 'summary';
  title: string;
  message: string;
  symbol?: string;
  timestamp: Date;
};

export class InsightsEngine extends EventEmitter {
  private isRunning = false;
  private pollTimer?: NodeJS.Timeout;
  private readonly intervalMs: number;

  constructor(intervalMs = 5000) {
    super();
    this.intervalMs = intervalMs;
  }

  start(symbol: string) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.emit('status', 'started');
    this.poll(symbol);
  }

  stop() {
    this.isRunning = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.emit('status', 'stopped');
  }

  private async poll(symbol: string) {
    if (!this.isRunning) return;
    try {
      const provider = getProvider();
      const [kpi, prices] = await Promise.all([
        provider.getKpis(symbol),
        provider.getPrices(symbol, '1M'),
      ]);

      // Simple heuristics for demo insights
      const last = prices[prices.length - 1];
      const first = prices[0];
      const perf = ((last.close - first.close) / first.close) * 100;
      const rising = perf > 3;
      const falling = perf < -3;

      if (rising) {
        this.emit('insight', this.createInsight('opportunity', symbol, `${symbol} is up ${perf.toFixed(1)}% over the past month.`));
      } else if (falling) {
        this.emit('insight', this.createInsight('risk', symbol, `${symbol} is down ${perf.toFixed(1)}% over the past month.`));
      }

      if (kpi.volume > 5_000_000) {
        this.emit('insight', this.createInsight('anomaly', symbol, `Unusually high volume: ${kpi.volume.toLocaleString()}`));
      }
    } catch (e) {
      this.emit('error', e);
    } finally {
      this.pollTimer = setTimeout(() => this.poll(symbol), this.intervalMs);
    }
  }

  private createInsight(type: Insight['type'], symbol: string, message: string): Insight {
    return {
      id: `ins-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      title: type === 'risk' ? 'Risk Alert' : type === 'opportunity' ? 'Opportunity' : 'Insight',
      message,
      symbol,
      timestamp: new Date(),
    };
  }
}


