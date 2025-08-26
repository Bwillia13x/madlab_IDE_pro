/**
 * Advanced Visualization Engine Core
 *
 * Provides a unified, high-performance visualization system with:
 * - Interactive charts with drill-down capabilities
 * - Real-time data streaming and updates
 * - Mobile-optimized rendering
 * - Extensible architecture for custom visualizations
 */

export interface VisualizationConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  theme: 'light' | 'dark';
  animation: boolean;
  responsive: boolean;
  interactive: boolean;
}

export interface DataPoint {
  [key: string]: any;
  timestamp?: Date | string | number;
  value?: number;
  x?: number | string | Date;
  y?: number | string;
  category?: string;
  color?: string;
  size?: number;
}

export interface ChartSeries {
  id: string;
  name: string;
  data: DataPoint[];
  type: 'line' | 'area' | 'bar' | 'scatter' | 'candlestick' | 'heatmap' | 'network';
  color?: string;
  style?: Record<string, any>;
  interactive?: boolean;
}

export interface InteractionEvent {
  type: 'click' | 'hover' | 'zoom' | 'pan' | 'select' | 'brush';
  data: any;
  position: { x: number; y: number };
  target?: string;
}

export interface DrillDownLevel {
  id: string;
  name: string;
  data: DataPoint[];
  config: Partial<VisualizationConfig>;
}

export class VisualizationEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: VisualizationConfig;
  private series: ChartSeries[] = [];
  private interactionHandlers: Map<string, (event: InteractionEvent) => void> = new Map();
  private drillDownStack: DrillDownLevel[] = [];
  private animationFrame: number | null = null;
  private isDirty = false;

  constructor(config: Partial<VisualizationConfig> = {}) {
    this.config = {
      width: 800,
      height: 600,
      margin: { top: 20, right: 20, bottom: 40, left: 40 },
      theme: 'dark',
      animation: true,
      responsive: true,
      interactive: true,
      ...config
    };
  }

  /**
   * Initialize the visualization engine with a canvas element
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('Could not get 2D context from canvas');
    }

    this.setupCanvas();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  /**
   * Set up canvas properties and scaling
   */
  private setupCanvas(): void {
    if (!this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
      this.ctx.imageSmoothingEnabled = true;
    }
  }

  /**
   * Set up event listeners for interactivity
   */
  private setupEventListeners(): void {
    if (!this.canvas) return;

    const handlePointerEvent = (type: InteractionEvent['type']) => (event: PointerEvent) => {
      if (!this.canvas) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Convert to canvas coordinates
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const canvasX = x * scaleX;
      const canvasY = y * scaleY;

      // Find interactive elements at this position
      const targetData = this.findInteractiveElement(canvasX, canvasY);

      this.emitInteraction({
        type,
        data: targetData,
        position: { x: canvasX, y: canvasY },
        target: targetData?.id
      });
    };

    this.canvas.addEventListener('click', (e) => handlePointerEvent('click')(e as PointerEvent));
    this.canvas.addEventListener('pointermove', (e) => handlePointerEvent('hover')(e));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
  }

  /**
   * Handle wheel events for zooming
   */
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;

    this.emitInteraction({
      type: 'zoom',
      data: { delta, direction: event.deltaY > 0 ? 'out' : 'in' },
      position: { x: event.clientX, y: event.clientY }
    });
  }

  /**
   * Handle pointer down for panning
   */
  private handlePointerDown(event: PointerEvent): void {
    // Implement panning logic
  }

  /**
   * Handle pointer up
   */
  private handlePointerUp(event: PointerEvent): void {
    // Implement pan end logic
  }

  /**
   * Find interactive element at given coordinates
   */
  private findInteractiveElement(x: number, y: number): any {
    // This will be implemented by specific chart types
    return null;
  }

  /**
   * Add a data series to the visualization
   */
  addSeries(series: ChartSeries): void {
    this.series.push(series);
    this.markDirty();
  }

  /**
   * Remove a data series
   */
  removeSeries(seriesId: string): void {
    this.series = this.series.filter(s => s.id !== seriesId);
    this.markDirty();
  }

  /**
   * Update a data series
   */
  updateSeries(seriesId: string, updates: Partial<ChartSeries>): void {
    const series = this.series.find(s => s.id === seriesId);
    if (series) {
      Object.assign(series, updates);
      this.markDirty();
    }
  }

  /**
   * Clear all series
   */
  clearSeries(): void {
    this.series = [];
    this.markDirty();
  }

  /**
   * Add interaction event handler
   */
  addInteractionHandler(type: string, handler: (event: InteractionEvent) => void): void {
    this.interactionHandlers.set(type, handler);
  }

  /**
   * Remove interaction handler
   */
  removeInteractionHandler(type: string): void {
    this.interactionHandlers.delete(type);
  }

  /**
   * Emit interaction event
   */
  public emitInteraction(event: InteractionEvent): void {
    const handler = this.interactionHandlers.get(event.type);
    if (handler) {
      handler(event);
    }
  }

  /**
   * Mark visualization as dirty (needs re-render)
   */
  private markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    const render = () => {
      if (this.isDirty) {
        this.render();
        this.isDirty = false;
      }
      this.animationFrame = requestAnimationFrame(render);
    };
    render();
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Main render method
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set theme colors
    this.applyTheme();

    // Draw background
    this.drawBackground();

    // Draw grid
    this.drawGrid();

    // Draw axes
    this.drawAxes();

    // Draw series data
    this.drawSeries();

    // Draw interactive overlays
    this.drawOverlays();
  }

  /**
   * Apply theme colors
   */
  private applyTheme(): void {
    if (!this.ctx) return;

    const isDark = this.config.theme === 'dark';
    this.ctx.fillStyle = isDark ? '#0f1419' : '#ffffff';
    this.ctx.strokeStyle = isDark ? '#2a2e33' : '#e1e5e9';
    this.ctx.font = '12px Inter, system-ui, sans-serif';
  }

  /**
   * Draw background
   */
  private drawBackground(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw grid lines
   */
  private drawGrid(): void {
    if (!this.ctx || !this.canvas) return;

    const { width, height, margin } = this.config;
    const gridColor = this.config.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;

    // Vertical grid lines
    for (let x = margin.left; x < width - margin.right; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, margin.top);
      this.ctx.lineTo(x, height - margin.bottom);
      this.ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = margin.top; y < height - margin.bottom; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(margin.left, y);
      this.ctx.lineTo(width - margin.right, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw axes
   */
  private drawAxes(): void {
    if (!this.ctx) return;

    const { width, height, margin } = this.config;

    this.ctx.strokeStyle = this.config.theme === 'dark' ? '#404040' : '#cccccc';
    this.ctx.lineWidth = 1;

    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(margin.left, height - margin.bottom);
    this.ctx.lineTo(width - margin.right, height - margin.bottom);
    this.ctx.stroke();

    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(margin.left, margin.top);
    this.ctx.lineTo(margin.left, height - margin.bottom);
    this.ctx.stroke();
  }

  /**
   * Draw data series
   */
  private drawSeries(): void {
    this.series.forEach(series => {
      this.drawSeriesData(series);
    });
  }

  /**
   * Draw individual series data
   */
  private drawSeriesData(series: ChartSeries): void {
    if (!this.ctx || series.data.length === 0) return;

    switch (series.type) {
      case 'line':
        this.drawLineSeries(series);
        break;
      case 'area':
        this.drawAreaSeries(series);
        break;
      case 'bar':
        this.drawBarSeries(series);
        break;
      case 'scatter':
        this.drawScatterSeries(series);
        break;
      default:
        console.warn(`Unsupported series type: ${series.type}`);
    }
  }

  /**
   * Draw line series
   */
  private drawLineSeries(series: ChartSeries): void {
    if (!this.ctx) return;

    const { width, height, margin } = this.config;
    const points = this.transformPoints(series.data);

    this.ctx.strokeStyle = series.color || '#7DC8F7';
    this.ctx.lineWidth = 2;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    points.forEach((point, index) => {
      const x = margin.left + (point.x * (width - margin.left - margin.right));
      const y = margin.top + (point.y * (height - margin.top - margin.bottom));

      if (index === 0) {
        this.ctx!.moveTo(x, y);
      } else {
        this.ctx!.lineTo(x, y);
      }
    });
    this.ctx!.stroke();
  }

  /**
   * Draw area series
   */
  private drawAreaSeries(series: ChartSeries): void {
    if (!this.ctx) return;

    const { width, height, margin } = this.config;
    const points = this.transformPoints(series.data);

    this.ctx.fillStyle = series.color || 'rgba(125, 200, 247, 0.2)';
    this.ctx.strokeStyle = series.color || '#7DC8F7';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    points.forEach((point, index) => {
      const x = margin.left + (point.x * (width - margin.left - margin.right));
      const y = margin.top + (point.y * (height - margin.top - margin.bottom));

      if (index === 0) {
        this.ctx!.moveTo(x, y);
      } else {
        this.ctx!.lineTo(x, y);
      }
    });

    // Close the path to the bottom
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    this.ctx!.lineTo(margin.left + (lastPoint.x * (width - margin.left - margin.right)), height - margin.bottom);
    this.ctx!.lineTo(margin.left + (firstPoint.x * (width - margin.left - margin.right)), height - margin.bottom);
    this.ctx!.closePath();

    this.ctx!.fill();
    this.ctx!.stroke();
  }

  /**
   * Draw bar series
   */
  private drawBarSeries(series: ChartSeries): void {
    if (!this.ctx) return;

    const { width, height, margin } = this.config;
    const barWidth = 40;
    const spacing = 10;

    this.ctx.fillStyle = series.color || '#7DC8F7';

    series.data.forEach((point, index) => {
      const x = margin.left + index * (barWidth + spacing);
      const y = height - margin.bottom - (Number(point.y) || 0) * (height - margin.top - margin.bottom);
      const barHeight = (Number(point.y) || 0) * (height - margin.top - margin.bottom);

      this.ctx!.fillRect(x, y, barWidth, barHeight);
    });
  }

  /**
   * Draw scatter series
   */
  private drawScatterSeries(series: ChartSeries): void {
    if (!this.ctx) return;

    const { width, height, margin } = this.config;
    const pointSize = series.style?.pointSize || 4;

    this.ctx.fillStyle = series.color || '#7DC8F7';

    series.data.forEach(point => {
      const x = margin.left + (Number(point.x) || 0) * (width - margin.left - margin.right);
      const y = margin.top + (Number(point.y) || 0) * (height - margin.top - margin.bottom);

      this.ctx!.beginPath();
      this.ctx!.arc(x, y, pointSize, 0, 2 * Math.PI);
      this.ctx!.fill();
    });
  }

  /**
   * Transform data points to normalized coordinates
   */
  private transformPoints(data: DataPoint[]): Array<{ x: number; y: number }> {
    if (data.length === 0) return [];

    // Find min/max values
    const xValues = data.map(d => typeof d.x === 'number' ? d.x : 0);
    const yValues = data.map(d => typeof d.y === 'number' ? d.y : 0);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    return data.map(d => ({
      x: (typeof d.x === 'number' ? d.x : 0 - xMin) / (xMax - xMin || 1),
      y: (typeof d.y === 'number' ? d.y : 0 - yMin) / (yMax - yMin || 1)
    }));
  }

  /**
   * Draw interactive overlays
   */
  private drawOverlays(): void {
    // This will be implemented for tooltips, selection highlights, etc.
  }

  /**
   * Resize the visualization
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.setupCanvas();
    this.markDirty();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...config };
    this.markDirty();
  }

  /**
   * Drill down to more detailed data
   */
  drillDown(level: DrillDownLevel): void {
    if (this.drillDownStack.length > 0) {
      this.drillDownStack.push(level);
    } else {
      this.drillDownStack = [level];
    }
    this.markDirty();
  }

  /**
   * Drill up to less detailed data
   */
  drillUp(): void {
    if (this.drillDownStack.length > 1) {
      this.drillDownStack.pop();
      this.markDirty();
    }
  }

  /**
   * Get current drill-down level
   */
  getCurrentDrillLevel(): DrillDownLevel | null {
    return this.drillDownStack[this.drillDownStack.length - 1] || null;
  }

  /**
   * Export visualization as image
   */
  exportAsImage(type: 'png' | 'jpeg' = 'png', quality = 0.9): string | null {
    if (!this.canvas) return null;

    try {
      return this.canvas.toDataURL(`image/${type}`, quality);
    } catch (error) {
      console.error('Failed to export image:', error);
      return null;
    }
  }

  /**
   * Export data as JSON
   */
  exportData(): any {
    return {
      config: this.config,
      series: this.series,
      drillDownStack: this.drillDownStack
    };
  }

  /**
   * Import data from JSON
   */
  importData(data: any): void {
    if (data.config) this.config = { ...this.config, ...data.config };
    if (data.series) this.series = data.series;
    if (data.drillDownStack) this.drillDownStack = data.drillDownStack;
    this.markDirty();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopRenderLoop();
    this.interactionHandlers.clear();
    this.series = [];
    this.drillDownStack = [];
  }
}
