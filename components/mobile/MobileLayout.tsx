'use client';

import { useState, useEffect, useRef } from 'react';
import { MobileNavigation } from './MobileNavigation';
import { MobileCandlestickChart } from './MobileCandlestickChart';
import { MobilePortfolioTracker } from './MobilePortfolioTracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Activity, 
  Settings,
  Plus,
  Grid3X3,
  List,
  Search
} from 'lucide-react';
import type { Widget } from '@/lib/store';

interface MobileLayoutProps {
  widgets: Widget[];
  onWidgetAdd?: (widgetType: string) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetUpdate?: (widgetId: string, updates: Partial<Widget>) => void;
}

interface MobileSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  widgets: Widget[];
}

export function MobileLayout({ 
  widgets, 
  onWidgetAdd, 
  onWidgetRemove, 
  onWidgetUpdate 
}: MobileLayoutProps) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [notifications, setNotifications] = useState(3);
  
  const layoutRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');

  // Organize widgets by section
  const sections: MobileSection[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: TrendingUp,
      widgets: widgets.filter(w => w.category === 'overview' || w.category === 'portfolio'),
    },
    {
      id: 'charts',
      title: 'Charts',
      icon: BarChart3,
      widgets: widgets.filter(w => w.category === 'charting'),
    },
    {
      id: 'portfolio',
      title: 'Portfolio',
      icon: PieChart,
      widgets: widgets.filter(w => w.category === 'portfolio'),
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: TrendingUp,
      widgets: widgets.filter(w => w.category === 'analytics'),
    },
    {
      id: 'news',
      title: 'News',
      icon: Activity,
      widgets: widgets.filter(w => w.category === 'news'),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      widgets: widgets.filter(w => w.category === 'settings'),
    },
  ];

  // Filter widgets based on search query
  // const filteredWidgets = widgets.filter(widget => 
  //   widget.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   widget.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   widget.category?.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  // Handle scroll direction for navigation auto-hide
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      scrollDirection.current = currentScrollY > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulate notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => Math.max(0, prev - 1));
    }, 30000); // Clear notification every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Render widget based on type
  const renderWidget = (widget: Widget) => {
    const commonProps = {
      widget,
      sheetId: 'mobile-sheet',
      onTitleChange: (title: string) => onWidgetUpdate?.(widget.id, { title }),
    };

    switch (widget.type) {
      case 'interactive-candlestick':
        return <MobileCandlestickChart {...commonProps} />;
      case 'portfolio-tracker':
      case 'realtime-portfolio':
        return <MobilePortfolioTracker {...commonProps} />;
      case 'portfolio-allocation':
        return <MobilePortfolioTracker {...commonProps} />;
      case 'technical-indicators':
        return <MobilePortfolioTracker {...commonProps} />;
      default:
        return (
          <Card className="mobile-widget">
            <CardHeader className="mobile-widget-header">
              <CardTitle className="mobile-card-title flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {widget.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="mobile-widget-content">
              <div className="text-center text-muted-foreground py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{widget.description || 'Widget content'}</p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  // Widget selector modal
  const WidgetSelector = () => (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Widget</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWidgetSelector(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  onWidgetAdd?.('interactive-candlestick');
                  setShowWidgetSelector(false);
                }}
              >
                <BarChart3 className="h-6 w-6" />
                <span className="text-xs">Candlestick Chart</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  onWidgetAdd?.('portfolio-tracker');
                  setShowWidgetSelector(false);
                }}
              >
                <PieChart className="h-6 w-6" />
                <span className="text-xs">Portfolio Tracker</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  onWidgetAdd?.('technical-indicators');
                  setShowWidgetSelector(false);
                }}
              >
                <TrendingUp className="h-6 w-6" />
                <span className="text-xs">Technical Indicators</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  onWidgetAdd?.('portfolio-allocation');
                  setShowWidgetSelector(false);
                }}
              >
                <PieChart className="h-6 w-6" />
                <span className="text-xs">Portfolio Allocation</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const currentSection = sections.find(s => s.id === activeSection);
  const sectionWidgets = currentSection?.widgets || [];

  return (
    <div className="min-h-screen bg-background" ref={layoutRef}>
      {/* Mobile Navigation */}
      <MobileNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        notifications={notifications}
      />

      {/* Main Content */}
      <div className="pt-16 pb-20">
        {/* Section Header with Actions */}
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">
                  {currentSection?.title}
                </h1>
                {sectionWidgets.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {sectionWidgets.length} widgets
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search widgets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-32 pl-8 pr-2 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                {/* View Mode Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="h-8 w-8 p-0"
                  title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                </Button>
                
                {/* Add Widget Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowWidgetSelector(true)}
                  className="h-8 px-3 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Widgets Grid/List */}
        <div className="px-4 py-4">
          {sectionWidgets.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No widgets in {currentSection?.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add some widgets to get started with your {currentSection?.title.toLowerCase()} analysis.
              </p>
              <Button
                onClick={() => setShowWidgetSelector(true)}
                className="mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'mobile-grid' : 'space-y-4'}>
              {sectionWidgets.map((widget) => (
                <div key={widget.id} className="relative group">
                  {/* Widget Actions Overlay */}
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onWidgetRemove?.(widget.id)}
                        className="h-6 w-6 p-0 bg-background/80 backdrop-blur"
                        title="Remove widget"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  
                  {/* Widget Content */}
                  {renderWidget(widget)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions FAB */}
        <div className="fixed bottom-24 right-4 z-40">
          <Button
            onClick={() => setShowWidgetSelector(true)}
            className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Widget Selector Modal */}
      {showWidgetSelector && <WidgetSelector />}

      {/* Pull to Refresh Indicator */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-muted/80 backdrop-blur rounded-full px-3 py-1 text-xs text-muted-foreground">
          Pull down to refresh
        </div>
      </div>
    </div>
  );
}