import { EventEmitter } from 'events';
import type { PricePoint, KpiData } from './provider.types';

export interface ChartUpdateData {
  symbol: string;
  type: 'price' | 'kpi' | 'volume';
  data: PricePoint | KpiData | number;
  timestamp: Date;
  isNewData: boolean;
  animationDuration?: number;
}

export interface ChartUpdateConfig {
  symbols: string[];
  updateInterval: number;
  enableAnimations: boolean;
  animationDuration: number;
  maxDataPoints: number;
  enableSmoothing: boolean;
  smoothingFactor: number;
}

export class RealTimeChartUpdateService extends EventEmitter {
  private config: ChartUpdateConfig;
  private isRunning = false;
  private updateTimer?: NodeJS.Timeout;
  private dataBuffer: Map<string, ChartUpdateData[]> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private animationFrameId?: number;

  constructor(config: ChartUpdateConfig) {
    super();
    this.config = {
      symbols: config.symbols || ['AAPL', 'MSFT', 'GOOGL'],
      updateInterval: config.updateInterval || 1000,
      enableAnimations: config.enableAnimations !== false,
      animationDuration: config.animationDuration || 300,
      maxDataPoints: config.maxDataPoints || 1000,
      enableSmoothing: config.enableSmoothing !== false,
      smoothingFactor: config.smoothingFactor || 0.3,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startUpdateLoop();
    this.emit('started');
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    
    this.emit('stopped');
  }

  private startUpdateLoop(): void {
    this.updateTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.generateUpdates();
      } catch (error) {
        console.error('Chart update error:', error);
        this.emit('error', error);
      }
    }, this.config.updateInterval);
  }

  private async generateUpdates(): Promise<void> {
    const now = Date.now();
    
    for (const symbol of this.config.symbols) {
      const lastUpdate = this.lastUpdateTime.get(symbol) || 0;
      const timeSinceLastUpdate = now - lastUpdate;
      
      // Generate realistic price movements
      if (timeSinceLastUpdate >= this.config.updateInterval) {
        const update = this.generatePriceUpdate(symbol, now);
        this.bufferUpdate(symbol, update);
        this.lastUpdateTime.set(symbol, now);
        
        // Emit update with animation timing
        if (this.config.enableAnimations) {
          this.scheduleAnimatedUpdate(symbol, update);
        } else {
          this.emit('update', update);
        }
      }
    }
  }

  private generatePriceUpdate(symbol: string, timestamp: number): ChartUpdateData {
    const basePrice = 100 + Math.random() * 900; // Base price between $100-$1000
    const volatility = 0.02; // 2% volatility
    const randomChange = (Math.random() - 0.5) * 2 * volatility * basePrice;
    
    const newPrice = basePrice + randomChange;
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    const priceData: PricePoint = {
      date: new Date(timestamp),
      open: basePrice,
      high: Math.max(basePrice, newPrice) + Math.random() * 5,
      low: Math.min(basePrice, newPrice) - Math.random() * 5,
      close: newPrice,
      volume: volume,
    };

    return {
      symbol,
      type: 'price',
      data: priceData,
      timestamp: new Date(timestamp),
      isNewData: true,
      animationDuration: this.config.animationDuration,
    };
  }

  private bufferUpdate(symbol: string, update: ChartUpdateData): void {
    if (!this.dataBuffer.has(symbol)) {
      this.dataBuffer.set(symbol, []);
    }
    
    const buffer = this.dataBuffer.get(symbol)!;
    buffer.push(update);
    
    // Maintain buffer size
    if (buffer.length > this.config.maxDataPoints) {
      buffer.splice(0, buffer.length - this.config.maxDataPoints);
    }
  }

  private scheduleAnimatedUpdate(symbol: string, update: ChartUpdateData): void {
    const steps = 10;
    const stepDuration = this.config.animationDuration / steps;
    let currentStep = 0;
    
    const animateStep = () => {
      if (currentStep >= steps || !this.isRunning) {
        this.emit('update', update);
        return;
      }
      
      const progress = currentStep / steps;
      const animatedUpdate = {
        ...update,
        isNewData: false,
        animationProgress: progress,
      };
      
      this.emit('animationStep', animatedUpdate);
      currentStep++;
      
      this.animationFrameId = requestAnimationFrame(() => {
        setTimeout(animateStep, stepDuration);
      });
    };
    
    animateStep();
  }

  // Public methods for external use
  addSymbol(symbol: string): void {
    if (!this.config.symbols.includes(symbol)) {
      this.config.symbols.push(symbol);
      this.dataBuffer.set(symbol, []);
      this.lastUpdateTime.set(symbol, Date.now());
    }
  }

  removeSymbol(symbol: string): void {
    this.config.symbols = this.config.symbols.filter(s => s !== symbol);
    this.dataBuffer.delete(symbol);
    this.lastUpdateTime.delete(symbol);
  }

  updateConfig(newConfig: Partial<ChartUpdateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  getBufferedData(symbol: string): ChartUpdateData[] {
    return this.dataBuffer.get(symbol) || [];
  }

  getSymbols(): string[] {
    return [...this.config.symbols];
  }

  getStatus(): {
    isRunning: boolean;
    symbols: string[];
    updateInterval: number;
    enableAnimations: boolean;
    bufferSizes: Record<string, number>;
  } {
    const bufferSizes: Record<string, number> = {};
    this.config.symbols.forEach(symbol => {
      bufferSizes[symbol] = this.dataBuffer.get(symbol)?.length || 0;
    });

    return {
      isRunning: this.isRunning,
      symbols: [...this.config.symbols],
      updateInterval: this.config.updateInterval,
      enableAnimations: this.config.enableAnimations,
      bufferSizes,
    };
  }

  // Utility methods for chart animations
  enableSmoothTransitions(): void {
    this.config.enableSmoothing = true;
  }

  disableSmoothTransitions(): void {
    this.config.enableSmoothing = false;
  }

  setAnimationDuration(duration: number): void {
    this.config.animationDuration = Math.max(100, Math.min(2000, duration));
  }

  setUpdateInterval(interval: number): void {
    this.config.updateInterval = Math.max(100, Math.min(10000, interval));
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Data smoothing for better chart appearance
  getSmoothedData(symbol: string, windowSize: number = 5): ChartUpdateData[] {
    const data = this.getBufferedData(symbol);
    if (data.length < windowSize) return data;

    const smoothed: ChartUpdateData[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        smoothed.push(data[i]);
        continue;
      }

      const window = data.slice(i - windowSize + 1, i + 1);
      const smoothedPrice = this.smoothPriceData(window);
      
      const smoothedUpdate: ChartUpdateData = {
        ...data[i],
        data: smoothedPrice,
        isNewData: false,
      };
      
      smoothed.push(smoothedUpdate);
    }

    return smoothed;
  }

  private smoothPriceData(data: ChartUpdateData[]): PricePoint {
    const prices = data.map(d => (d.data as PricePoint).close);
    const volumes = data.map(d => (d.data as PricePoint).volume);
    
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const avgVolume = volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length;
    
    const latest = data[data.length - 1].data as PricePoint;
    
    return {
      ...latest,
      close: avgPrice,
      volume: avgVolume,
    };
  }

  // Performance monitoring
  getPerformanceMetrics(): {
    updateRate: number;
    bufferUtilization: number;
    memoryUsage: number;
  } {
    const totalBufferSize = Array.from(this.dataBuffer.values())
      .reduce((sum, buffer) => sum + buffer.length, 0);
    
    const updateRate = 1000 / this.config.updateInterval;
    const bufferUtilization = totalBufferSize / (this.config.symbols.length * this.config.maxDataPoints);
    const memoryUsage = totalBufferSize * 0.001; // Rough estimate in MB
    
    return {
      updateRate,
      bufferUtilization,
      memoryUsage,
    };
  }
}

// Singleton instance
let chartUpdateService: RealTimeChartUpdateService | null = null;

export function getChartUpdateService(): RealTimeChartUpdateService {
  if (!chartUpdateService) {
    chartUpdateService = new RealTimeChartUpdateService({
      symbols: ['AAPL', 'MSFT', 'GOOGL'],
      updateInterval: 1000,
      enableAnimations: true,
      animationDuration: 300,
      maxDataPoints: 1000,
      enableSmoothing: true,
      smoothingFactor: 0.3,
    });
  }
  return chartUpdateService;
}

export function createChartUpdateService(config: ChartUpdateConfig): RealTimeChartUpdateService {
  if (chartUpdateService) {
    chartUpdateService.stop();
  }
  
  chartUpdateService = new RealTimeChartUpdateService(config);
  return chartUpdateService;
}