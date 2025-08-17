'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Package, Settings, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { SheetKind, useWorkspaceStore } from '@/lib/store';

interface WidgetSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean';
    default?: any;
    enum?: string[];
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

const tagsUniverse = ['KPI', 'Valuation', 'Comps', 'TA', 'Charting', 'Risk', 'VaR', 'Stress', 'Options', 'Greeks', 'Vol', 'Utilities', 'Experimental'];

const widgetCatalog: WidgetDefinition[] = [
  {
    id: 'kpi-card',
    name: 'KPI — Revenue',
    sheets: ['valuation'],
    tags: ['KPI', 'Valuation'],
    desc: 'TTM revenue tile with sparkline.',
    schema: {
      units: { type: 'string', enum: ['$', '€', '£'], default: '$' },
      showYoY: { type: 'boolean', default: true }
    }
  },
  {
    id: 'kpi-margin',
    name: 'KPI — EBIT Margin',
    sheets: ['valuation'],
    tags: ['KPI', 'Valuation'],
    desc: 'EBIT margin tile with QoQ/YoY deltas.',
    schema: {
      format: { type: 'string', enum: ['%', 'bps'], default: '%' },
      showDelta: { type: 'boolean', default: true }
    }
  },
  {
    id: 'dcf-basic',
    name: 'DCF (Basic)',
    sheets: ['valuation'],
    tags: ['Valuation'],
    desc: 'Single‑stage perpetuity model input panel.',
    schema: {
      fcf1: { type: 'number', default: 260 },
      wacc: { type: 'number', default: 8.0 },
      g: { type: 'number', default: 2.0 }
    }
  },
  {
    id: 'bar-chart',
    name: 'Peers — Multiples',
    sheets: ['valuation'],
    tags: ['Valuation', 'Comps'],
    desc: 'EV/EBITDA, P/E, FCF yield snapshot.',
    schema: {
      universe: { type: 'string', default: 'SPX Tech' },
      metrics: { type: 'string', default: 'EV/EBITDA,P/E,FCFY' }
    }
  },
  {
    id: 'line-chart',
    name: 'Price — Interactive',
    sheets: ['charting'],
    tags: ['Charting', 'TA'],
    desc: 'Canvas OHLC/line preview with controls.',
    schema: {
      points: { type: 'number', default: 120 },
      volatility: { type: 'number', default: 18 }
    }
  },
  {
    id: 'heatmap',
    name: 'Heatmap',
    sheets: ['charting'],
    tags: ['Charting'],
    desc: 'Sector / group heat tiles.',
    schema: {
      mode: { type: 'string', enum: ['sectors', 'watchlist'], default: 'sectors' }
    }
  },
  {
    id: 'var-es',
    name: 'VaR / ES',
    sheets: ['risk'],
    tags: ['Risk', 'VaR'],
    desc: 'Parametric VaR/ES calculator.',
    schema: {
      portfolio: { type: 'number', default: 25 },
      sigma: { type: 'number', default: 2.1 },
      z: { type: 'number', default: 1.65 }
    }
  },
  {
    id: 'stress-scenarios',
    name: 'Stress Scenarios',
    sheets: ['risk'],
    tags: ['Risk', 'Stress'],
    desc: 'Preset shocks & buttons.',
    schema: {
      shocks: { type: 'string', default: '-7% day,+10% vol' }
    }
  },
  {
    id: 'greeks-surface',
    name: 'Black‑Scholes Pricer',
    sheets: ['options'],
    tags: ['Options', 'Greeks'],
    desc: 'European call/put pricer widget.',
    schema: {
      S: { type: 'number', default: 100 },
      K: { type: 'number', default: 100 },
      sigma: { type: 'number', default: 20 },
      r: { type: 'number', default: 3 },
      T: { type: 'number', default: 1 }
    }
  },
  {
    id: 'vol-cone',
    name: 'Volatility Cone',
    sheets: ['options'],
    tags: ['Options', 'Vol'],
    desc: 'Historical vs implied cone (mock).',
    schema: {
      window: { type: 'number', default: 252 },
      horizons: { type: 'string', default: '10,20,60,120' }
    }
  }
];

export default function WidgetsPage() {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SheetKind>('valuation');
  const [selectedWidget, setSelectedWidget] = useState<WidgetDefinition | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [theme, setTheme] = useState('malibu-sunrise');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { addWidget, sheets, setActiveSheet } = useWorkspaceStore();

  // Filter widgets based on search and tags
  const filteredWidgets = widgetCatalog.filter(widget => {
    const matchesTag = !activeTag || widget.tags.includes(activeTag);
    const matchesQuery = !query || 
      widget.name.toLowerCase().includes(query.toLowerCase()) ||
      widget.tags.join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesTag && matchesQuery;
  });

  // Initialize default configuration from schema
  const getDefaultConfig = (schema?: WidgetSchema) => {
    if (!schema) return {};
    const defaults: Record<string, any> = {};
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
    const savedConfig = getSavedConfig(widget.id);
    const defaultConfig = getDefaultConfig(widget.schema);
    setConfig({ ...defaultConfig, ...savedConfig });
    drawPreview(widget);
  };

  // Draw widget preview on canvas
  const drawPreview = (widget: WidgetDefinition) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.strokeRect(0, 0, width, height);

    // Draw different previews based on widget type
    ctx.strokeStyle = 'rgba(125,200,247,0.9)';
    ctx.fillStyle = 'rgba(125,200,247,0.6)';
    ctx.lineWidth = 2;

    if (widget.id.includes('kpi')) {
      // KPI preview
      ctx.fillRect(20, 20, width - 40, height - 40);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(30, height - 40, width - 60, 20);
    } else if (widget.id.includes('dcf')) {
      // DCF preview
      ctx.fillRect(20, 20, width - 40, height - 40);
      ctx.fillStyle = 'rgba(255,126,182,0.7)';
      ctx.fillRect(30, 30, width / 2, height - 60);
    } else if (widget.id.includes('chart') || widget.id.includes('line')) {
      // Chart preview
      ctx.beginPath();
      ctx.moveTo(20, height - 20);
      for (let i = 0; i < 50; i++) {
        const x = 20 + i * (width - 40) / 49;
        const y = 20 + (height - 40) * (0.3 + 0.3 * Math.sin(i / 6));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (widget.id.includes('heatmap')) {
      // Heatmap preview
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i % 3) * (width - 40) / 3;
        const y = 20 + Math.floor(i / 3) * (height - 40) / 2;
        ctx.fillStyle = i % 2 ? 'rgba(50,214,147,0.6)' : 'rgba(255,107,107,0.6)';
        ctx.fillRect(x, y, (width - 40) / 3 - 5, (height - 40) / 2 - 5);
      }
    } else {
      // Default preview
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(20, 20, width - 40, height - 40);
    }
  };

  // Configuration management
  const getSavedConfig = (widgetId: string) => {
    try {
      return JSON.parse(localStorage.getItem(`madlab_widget_config_${widgetId}`) || '{}');
    } catch {
      return {};
    }
  };

  const saveConfig = () => {
    if (!selectedWidget) return;
    localStorage.setItem(`madlab_widget_config_${selectedWidget.id}`, JSON.stringify(config));
    toast({ title: 'Configuration saved' });
  };

  const resetConfig = () => {
    if (!selectedWidget) return;
    const defaultConfig = getDefaultConfig(selectedWidget.schema);
    setConfig(defaultConfig);
    localStorage.setItem(`madlab_widget_config_${selectedWidget.id}`, JSON.stringify(defaultConfig));
    toast({ title: 'Configuration reset' });
  };

  // Add widget to workbench
  const addToWorkbench = () => {
    if (!selectedWidget) return;
    
    const targetSheet = sheets.find(s => s.kind === selectedSheet);
    if (!targetSheet) return;

    if (!selectedWidget.sheets.includes(selectedSheet) || selectedWidget.previewOnly) {
      toast({ 
        title: 'Incompatible widget', 
        description: 'This widget is not compatible with the selected sheet.',
        variant: 'destructive'
      });
      return;
    }

    // Create widget with configuration
    const widget = {
      type: selectedWidget.id,
      title: selectedWidget.name,
      layout: { i: '', x: 0, y: 0, w: 6, h: 4 },
      props: config
    };

    addWidget(targetSheet.id, widget);
    setActiveSheet(targetSheet.id);
    
    toast({ 
      title: 'Widget added', 
      description: `${selectedWidget.name} added to ${selectedSheet} sheet.` 
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="h-14 flex items-center gap-3 px-4 border-b bg-card/50 backdrop-blur-xl">
        <div className="w-5 h-5 rounded-md bg-gradient-to-r from-primary via-accent to-secondary shadow-lg" />
        <div className="font-bold">MAD LAB — Widget Library</div>
        <Badge variant="secondary">/widgets</Badge>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets, tags… (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 w-80"
          />
        </div>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="malibu-sunrise">Malibu — Sunrise</SelectItem>
            <SelectItem value="malibu-sunset">Malibu — Sunset</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        {/* Left: Filters */}
        <aside className="col-span-3 bg-card/50 border rounded-lg p-4 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Filters</h3>
            <Badge variant="outline">{filteredWidgets.length}</Badge>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-muted-foreground mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {tagsUniverse.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      activeTag === tag 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-card hover:bg-muted border-border'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm text-muted-foreground mb-2">Target sheet</h4>
              <Select value={selectedSheet} onValueChange={(value: SheetKind) => setSelectedSheet(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valuation">Valuation</SelectItem>
                  <SelectItem value="charting">Charting</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Only widgets compatible with the selected sheet can be added to the Workbench grid.
              </p>
            </div>
          </div>
        </aside>

        {/* Center: Widget Cards */}
        <section className="col-span-6 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Widgets</h3>
            <Badge variant="outline">click to preview</Badge>
          </div>
          
          <div className="p-4 overflow-auto">
            <div className="grid grid-cols-3 gap-4">
              {filteredWidgets.map(widget => (
                <div 
                  key={widget.id}
                  className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => selectWidget(widget)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{widget.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {widget.sheets.join(',')}
                    </Badge>
                  </div>
                  
                  <div className="h-20 border border-dashed rounded bg-muted/20 flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  
                  <p className="text-xs text-muted-foreground">{widget.desc}</p>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Preview & Configuration */}
        <aside className="col-span-3 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Preview & Schema</h3>
            <Badge variant="outline">{selectedWidget?.id || '—'}</Badge>
          </div>
          
          <div className="p-4 space-y-4 overflow-auto">
            {selectedWidget ? (
              <>
                <div>
                  <h4 className="font-medium">{selectedWidget.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedWidget.desc}</p>
                  <div className="flex gap-1 mt-2">
                    {selectedWidget.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div className="border border-dashed rounded-lg p-4 bg-muted/20">
                  <canvas 
                    ref={canvasRef}
                    width={300} 
                    height={120}
                    className="w-full h-auto border rounded"
                  />
                </div>

                {selectedWidget.schema && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Configuration</h5>
                    {Object.entries(selectedWidget.schema).map(([key, prop]) => (
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

                <div className="space-y-2">
                  <Button 
                    onClick={addToWorkbench}
                    disabled={!selectedWidget.sheets.includes(selectedSheet) || selectedWidget.previewOnly}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to {selectedSheet}
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={saveConfig} className="flex-1">
                      Save Config
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetConfig} className="flex-1">
                      Reset
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Adds this widget to the selected sheet's layout order in localStorage (used by the Workbench).
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Select a widget to preview</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}