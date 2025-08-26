'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { SheetKind, useWorkspaceStore, type Widget } from '@/lib/store';

interface WidgetSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select';
    default?: unknown;
    enum?: string[];
    options?: string[];
  };
}

interface WidgetDefinition {
  id: string;
  name: string;
  sheets: SheetKind[];
  tags: string[];
  desc: string;
  schema?: WidgetSchema;
  previewOnly?: boolean;
}

// Widget catalog with mappings to actual widget types
const widgetCatalog: WidgetDefinition[] = [
  {
    id: 'kpi-card',
    name: 'KPI Card',
    sheets: ['valuation'],
    tags: ['KPI', 'Valuation'],
    desc: 'Key performance indicator with sparkline and trend data.',
    schema: {
      metric: { type: 'string', default: 'Revenue' },
      showYoY: { type: 'boolean', default: true }
    }
  },
  {
    id: 'dcf-basic',
    name: 'DCF Model (Basic)',
    sheets: ['valuation'],
    tags: ['Valuation', 'DCF'],
    desc: 'Discounted cash flow valuation model with sensitivity analysis.',
    schema: {
      fcf1: { type: 'number', default: 260 },
      wacc: { type: 'number', default: 8.0 },
      g: { type: 'number', default: 2.0 }
    }
  },
  {
    id: 'bar-chart',
    name: 'Bar Chart',
    sheets: ['valuation', 'charting'],
    tags: ['Charts', 'Visualization'],
    desc: 'Customizable bar chart for financial data comparison.',
    schema: {
      metric: { type: 'string', default: 'Revenue' },
      periods: { type: 'number', default: 8 }
    }
  },
  {
    id: 'line-chart',
    name: 'Line Chart',
    sheets: ['charting'],
    tags: ['Charts', 'Technical Analysis'],
    desc: 'Interactive line chart with technical indicators.',
    schema: {
      timeframe: { type: 'string', enum: ['1D', '1W', '1M', '1Y'], default: '1M' },
      showMA: { type: 'boolean', default: true }
    }
  },
  {
    id: 'heatmap',
    name: 'Heatmap',
    sheets: ['charting', 'risk'],
    tags: ['Visualization', 'Risk'],
    desc: 'Color-coded heatmap for correlation or performance data.',
    schema: {
      dataType: { type: 'string', enum: ['correlation', 'performance', 'sectors'], default: 'performance' }
    }
  },
  {
    id: 'var-es',
    name: 'VaR / ES Calculator',
    sheets: ['risk'],
    tags: ['Risk', 'VaR'],
    desc: 'Value at Risk and Expected Shortfall calculations.',
    schema: {
      portfolio: { type: 'number', default: 25 },
      confidence: { type: 'number', default: 95 },
      timeHorizon: { type: 'number', default: 1 }
    }
  },
  {
    id: 'stress-scenarios',
    name: 'Stress Testing',
    sheets: ['risk'],
    tags: ['Risk', 'Stress Testing'],
    desc: 'Scenario analysis and stress testing framework.',
    schema: {
      scenarios: { type: 'string', default: 'Market Crash,Rate Hike,Credit Crisis' }
    }
  },
  {
    id: 'greeks-surface',
    name: 'Options Greeks',
    sheets: ['options'],
    tags: ['Options', 'Greeks'],
    desc: 'Options sensitivity analysis and Greeks calculation.',
    schema: {
      underlying: { type: 'number', default: 100 },
      volatility: { type: 'number', default: 20 }
    }
  },
  {
    id: 'vol-cone',
    name: 'Volatility Cone',
    sheets: ['options'],
    tags: ['Options', 'Volatility'],
    desc: 'Historical and implied volatility analysis.',
    schema: {
      lookback: { type: 'number', default: 252 },
      percentiles: { type: 'string', default: '10,25,50,75,90' }
    }
  }
];

const tagsUniverse = ['KPI', 'Valuation', 'DCF', 'Charts', 'Visualization', 'Technical Analysis', 'Risk', 'VaR', 'Stress Testing', 'Options', 'Greeks', 'Volatility'];

interface WidgetGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetSheet?: SheetKind;
}

export function WidgetGallery({ open, onOpenChange, targetSheet }: WidgetGalleryProps) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SheetKind>(targetSheet || 'valuation');
  const [selectedWidget, setSelectedWidget] = useState<WidgetDefinition | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { addWidget, sheets } = useWorkspaceStore();

  // Update selected sheet when targetSheet prop changes
  useEffect(() => {
    if (targetSheet) {
      setSelectedSheet(targetSheet);
    }
  }, [targetSheet]);

  // Filter widgets
  const filteredWidgets = widgetCatalog.filter(widget => {
    const matchesTag = !activeTag || widget.tags.includes(activeTag);
    const matchesQuery = !query || 
      widget.name.toLowerCase().includes(query.toLowerCase()) ||
      widget.tags.join(' ').toLowerCase().includes(query.toLowerCase());
    const matchesSheet = widget.sheets.includes(selectedSheet);
    return matchesTag && matchesQuery && matchesSheet;
  });

  // Get default config from schema
  const getDefaultConfig = (schema?: WidgetSchema) => {
    if (!schema) return {};
    const defaults: Record<string, unknown> = {};
    Object.entries(schema).forEach(([key, prop]) => {
      if ('default' in prop) {
        defaults[key] = prop.default;
      } else if (prop.type === 'number') {
        defaults[key] = 0;
      } else if (prop.type === 'boolean') {
        defaults[key] = false;
      } else {
        defaults[key] = '';
      }
    });
    return defaults;
  };

  // Handle widget selection
  const selectWidget = (widget: WidgetDefinition) => {
    setSelectedWidget(widget);
    const defaultConfig = getDefaultConfig(widget.schema);
    setConfig(defaultConfig);
    drawPreview(widget);
  };

  // Draw preview
  const drawPreview = (widget: WidgetDefinition) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(0, 0, width, height);

    // Widget-specific preview
    ctx.lineWidth = 2;
    
    if (widget.id.includes('kpi')) {
      ctx.fillStyle = 'rgba(125,200,247,0.8)';
      ctx.fillRect(10, 10, width - 20, height - 20);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(20, height - 30, width - 40, 15);
    } else if (widget.id.includes('dcf')) {
      ctx.fillStyle = 'rgba(125,200,247,0.6)';
      ctx.fillRect(10, 10, width - 20, height - 20);
      ctx.fillStyle = 'rgba(255,126,182,0.7)';
      ctx.fillRect(15, 15, width / 2, height - 30);
    } else if (widget.id.includes('chart') || widget.id.includes('line')) {
      ctx.strokeStyle = 'rgba(125,200,247,0.9)';
      ctx.beginPath();
      ctx.moveTo(10, height - 10);
      for (let i = 0; i < 40; i++) {
        const x = 10 + i * (width - 20) / 39;
        const y = 10 + (height - 20) * (0.3 + 0.4 * Math.sin(i / 5));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (widget.id.includes('heatmap')) {
      for (let i = 0; i < 12; i++) {
        const x = 10 + (i % 4) * (width - 20) / 4;
        const y = 10 + Math.floor(i / 4) * (height - 20) / 3;
        const intensity = (i + 1) / 12;
        ctx.fillStyle = `rgba(125,200,247,${0.3 + intensity * 0.5})`;
        ctx.fillRect(x, y, (width - 20) / 4 - 2, (height - 20) / 3 - 2);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(10, 10, width - 20, height - 20);
    }
  };

  // Add widget to workbench
  const addToWorkbench = () => {
    if (!selectedWidget) return;
    
    const targetSheetObj = sheets.find(s => s.kind === selectedSheet);
    if (!targetSheetObj) return;

    // Create widget with configuration
    const widget: Omit<Widget, 'id'> = {
      type: selectedWidget.id,
      title: selectedWidget.name,
      layout: { i: '', x: 0, y: 0, w: 6, h: 4 },
      props: config
    };

    addWidget(targetSheetObj.id, widget);
    
    toast({ 
      title: 'Widget added', 
      description: `${selectedWidget.name} added to ${selectedSheet} sheet.` 
    });
    
    onOpenChange(false);
  };

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${
        isMobile
          ? 'max-w-full h-[90vh] mx-2'
          : 'max-w-6xl h-[80vh]'
      } flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-md bg-gradient-to-r from-primary via-accent to-secondary" />
            Widget Gallery
            <Badge variant="secondary">/widgets</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Search and filters */}
        <div className={`${
          isMobile
            ? 'flex flex-col gap-3 p-4 border-b'
            : 'flex items-center gap-3 p-4 border-b'
        }`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {!isMobile && (
            <Select value={selectedSheet} onValueChange={(value: SheetKind) => setSelectedSheet(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valuation">Valuation</SelectItem>
                <SelectItem value="charting">Charting</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="options">Options</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Mobile sheet selector */}
        {isMobile && (
          <div className="px-4 pb-3 border-b">
            <div className="flex gap-2 overflow-x-auto">
              {['valuation', 'charting', 'screening', 'portfolio', 'risk', 'options', 'blank'].map((sheet) => (
                <Button
                  key={sheet}
                  variant={selectedSheet === sheet ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSheet(sheet as SheetKind)}
                  className="flex-shrink-0 text-xs"
                >
                  {sheet.charAt(0).toUpperCase() + sheet.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className={`${
          isMobile
            ? 'flex flex-col flex-1 min-h-0'
            : 'flex gap-4 flex-1 min-h-0'
        }`}>
          {/* Left: Tags */}
          {!isMobile && (
            <div className="w-48 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Tags</span>
              </div>
              <div className="space-y-1">
                {tagsUniverse.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors ${
                      activeTag === tag
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile tags */}
          {isMobile && (
            <div className="px-4 pb-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Tags</span>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {tagsUniverse.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
                      activeTag === tag
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Center: Widget grid */}
          <div className="flex-1 overflow-auto">
            <div className={`${
              isMobile
                ? 'grid grid-cols-1 gap-3 p-4'
                : 'grid grid-cols-2 gap-4 p-2'
            }`}>
              {filteredWidgets.map(widget => (
                <div
                  key={widget.id}
                  className={`border rounded-lg cursor-pointer transition-colors ${
                    isMobile
                      ? 'p-3 active:scale-95'
                      : `p-4 ${selectedWidget?.id === widget.id
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'}`
                  }`}
                  onClick={() => {
                    selectWidget(widget);
                    // On mobile, immediately show preview
                    if (isMobile && selectedWidget?.id !== widget.id) {
                      setTimeout(() => {
                        document.getElementById('mobile-preview')?.scrollIntoView({
                          behavior: 'smooth'
                        });
                      }, 100);
                    }
                  }}
                  onMouseEnter={() => {
                    if (!isMobile) {
                      // Opportunistically preload critical widgets
                      try {
                        if (widget.id === 'candlestick-chart') {
                          import('../widgets/CandlestickChart');
                        } else if (widget.id === 'advanced-chart') {
                          import('../widgets/AdvancedChart');
                        } else if (widget.id === 'options-chain') {
                          import('../widgets/OptionsChainWidget');
                        }
                      } catch {}
                    }
                  }}
                  draggable={!isMobile}
                  onDragStart={(e) => {
                    if (!isMobile) {
                      // Package widget payload for drop target
                      const payload = {
                        type: widget.id,
                        title: widget.name,
                        config: getDefaultConfig(widget.schema),
                        sheets: widget.sheets,
                      };
                      e.dataTransfer.setData('application/x-madlab-widget', JSON.stringify(payload));
                      e.dataTransfer.effectAllowed = 'copyMove';
                    }
                  }}
                >
                  <div className={`${
                    isMobile
                      ? 'flex items-start gap-3'
                      : 'flex items-center justify-between mb-3'
                  }`}>
                    <div className="flex-1">
                      <h4 className={`font-medium ${isMobile ? 'text-base mb-1' : ''}`}>{widget.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{widget.desc}</p>
                    </div>
                    {!isMobile && (
                      <div className="flex gap-1">
                        {widget.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {isMobile && (
                    <div className="flex gap-1 mt-2">
                      {widget.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {!isMobile && (
                    <div className="h-16 border border-dashed rounded bg-muted/20 flex items-center justify-center mb-3">
                      <Package className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Preview */}
          {!isMobile && (
            <div className="w-80 border-l pl-4 space-y-4">
              {selectedWidget ? (
                <>
                  <div>
                    <h4 className="font-medium">{selectedWidget.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedWidget.desc}</p>
                  </div>

                  <div className="border border-dashed rounded-lg p-4 bg-muted/20">
                    <canvas
                      ref={canvasRef}
                      width={240}
                      height={120}
                      className="w-full h-auto"
                    />
                  </div>

                  {selectedWidget.schema && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium">Configuration</h5>
                      {Object.entries(selectedWidget.schema).map(([key, prop]: [string, WidgetSchema[keyof WidgetSchema]]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{key}</label>
                          {prop.enum ? (
                            <Select
                              value={config[key]?.toString()}
                              onValueChange={(value) => setConfig(prev => ({ ...prev, [key]: value }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {prop.enum.map(option => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : prop.type === 'boolean' ? (
                            <Select
                              value={config[key]?.toString()}
                              onValueChange={(value) => setConfig(prev => ({ ...prev, [key]: value === 'true' }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={prop.type === 'number' ? 'number' : 'text'}
                              value={config[key]?.toString() || ''}
                              onChange={(e) => {
                                const value = prop.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                                setConfig(prev => ({ ...prev, [key]: value }));
                              }}
                              className="h-8"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={addToWorkbench} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add to {selectedSheet}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Select a widget to preview</p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Preview */}
          {isMobile && selectedWidget && (
            <div id="mobile-preview" className="border-t p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{selectedWidget.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedWidget.desc}</p>
                </div>
                <Button onClick={addToWorkbench} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="border border-dashed rounded-lg p-4 bg-muted/20">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={140}
                  className="w-full h-auto"
                />
              </div>

              {selectedWidget.schema && (
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Configuration</h5>
                  {Object.entries(selectedWidget.schema).map(([key, prop]: [string, WidgetSchema[keyof WidgetSchema]]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-xs text-muted-foreground">{key}</label>
                      {prop.enum ? (
                        <Select
                          value={config[key]?.toString()}
                          onValueChange={(value) => setConfig(prev => ({ ...prev, [key]: value }))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {prop.enum.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : prop.type === 'boolean' ? (
                        <Select
                          value={config[key]?.toString()}
                          onValueChange={(value) => setConfig(prev => ({ ...prev, [key]: value === 'true' }))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={prop.type === 'number' ? 'number' : 'text'}
                          value={config[key]?.toString() || ''}
                          onChange={(e) => {
                            const value = prop.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                            setConfig(prev => ({ ...prev, [key]: value }));
                          }}
                          className="h-10"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}