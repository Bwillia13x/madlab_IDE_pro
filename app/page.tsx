'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { WidgetGrid } from '@/components/WidgetGrid';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { useWidgetStore } from '@/lib/widgetStore';
import { 
  Monitor, 
  Smartphone, 
  Plus, 
  Settings, 
  BarChart3, 
  TrendingUp,
  Activity,
  RefreshCw
} from 'lucide-react';

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const { widgets, addWidget, removeWidget, updateWidget } = useWidgetStore();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobile|android|iphone|ipad|phone/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
      
      // Auto-switch to mobile view on mobile devices
      if (isMobileDevice || isSmallScreen) {
        setViewMode('mobile');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle widget operations
  const handleAddWidget = (widgetType: string) => {
    const newWidget = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      title: `New ${widgetType.replace('-', ' ')}`,
      description: `Widget description for ${widgetType}`,
      category: widgetType.includes('portfolio') ? 'portfolio' : 'charting',
      props: {},
      layout: { i: `${widgetType}-${Date.now()}`, w: 6, h: 8, x: 0, y: 0 },
    };
    addWidget(newWidget);
    setShowWidgetSelector(false);
  };

  const handleRemoveWidget = (widgetId: string) => {
    removeWidget(widgetId);
  };

  const handleUpdateWidget = (widgetId: string, updates: any) => {
    updateWidget(widgetId, updates);
  };

  // Widget selector modal
  const WidgetSelector = () => (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add New Widget</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWidgetSelector(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            <p className="text-muted-foreground mt-2">
              Choose a widget type to add to your dashboard
            </p>
          </div>
          
          <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
            {/* Charting Widgets */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Charting & Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleAddWidget('interactive-candlestick')}
                >
                  <BarChart3 className="h-8 w-8" />
                  <span className="text-sm font-medium">Interactive Candlestick</span>
                  <span className="text-xs text-muted-foreground">Professional D3.js chart</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleAddWidget('technical-indicators')}
                >
                  <TrendingUp className="h-8 w-8" />
                  <span className="text-sm font-medium">Technical Indicators</span>
                  <span className="text-xs text-muted-foreground">RSI, MACD, Bollinger Bands</span>
                </Button>
              </div>
            </div>

            {/* Portfolio Widgets */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Portfolio Management
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleAddWidget('portfolio-tracker')}
                >
                  <TrendingUp className="h-8 w-8" />
                  <span className="text-sm font-medium">Portfolio Tracker</span>
                  <span className="text-xs text-muted-foreground">Asset management & tracking</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleAddWidget('realtime-portfolio')}
                >
                  <Activity className="h-8 w-8" />
                  <span className="text-sm font-medium">Real-time Portfolio</span>
                  <span className="text-xs text-muted-foreground">Live updates & performance</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleAddWidget('portfolio-allocation')}
                >
                  <BarChart3 className="h-8 w-8" />
                  <span className="text-sm font-medium">Portfolio Allocation</span>
                  <span className="text-xs text-muted-foreground">Pie, treemap & bar charts</span>
                </Button>
              </div>
            </div>

            {/* Utility Widgets */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Utilities
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleAddWidget('blank-tile')}
                >
                  <div className="h-8 w-8 border-2 border-dashed border-muted-foreground rounded" />
                  <span className="text-sm font-medium">Blank Tile</span>
                  <span className="text-xs text-muted-foreground">Custom content area</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">MAD LAB</h1>
            </div>
            <Badge variant="secondary" className="text-xs">
              v2.0 - Mobile Ready
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="h-8 px-3 text-xs"
              >
                <Monitor className="h-3 w-3 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="h-8 px-3 text-xs"
              >
                <Smartphone className="h-3 w-3 mr-1" />
                Mobile
              </Button>
            </div>

            {/* Add Widget Button */}
            <Button
              onClick={() => setShowWidgetSelector(true)}
              className="h-8 px-3 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Widget
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {viewMode === 'desktop' ? (
          <div className="space-y-6">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Widgets</span>
                </div>
                <div className="text-2xl font-bold mt-2">{widgets.length}</div>
              </div>
              
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Portfolio Widgets</span>
                </div>
                <div className="text-2xl font-bold mt-2">
                  {widgets.filter(w => w.category === 'portfolio').length}
                </div>
              </div>
              
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Chart Widgets</span>
                </div>
                <div className="text-2xl font-bold mt-2">
                  {widgets.filter(w => w.category === 'charting').length}
                </div>
              </div>
              
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Real-time</span>
                </div>
                <div className="text-2xl font-bold mt-2 text-green-600">Active</div>
              </div>
            </div>

            {/* Desktop Widget Grid */}
            <WidgetGrid
              widgets={widgets}
              onWidgetRemove={handleRemoveWidget}
              onWidgetUpdate={handleUpdateWidget}
            />
          </div>
        ) : (
          /* Mobile Layout */
          <MobileLayout
            widgets={widgets}
            onWidgetAdd={handleAddWidget}
            onWidgetRemove={handleRemoveWidget}
            onWidgetUpdate={handleUpdateWidget}
          />
        )}
      </main>

      {/* Widget Selector Modal */}
      {showWidgetSelector && <WidgetSelector />}

      {/* Mobile Detection Notice */}
      {isMobile && viewMode === 'desktop' && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-primary text-primary-foreground rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Mobile device detected! Switch to mobile view for better experience.
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="h-7 px-2 text-xs"
              >
                Switch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}