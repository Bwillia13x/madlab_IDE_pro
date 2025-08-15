'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Star, Grid, List, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspaceStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface WidgetPackage {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  rating: number;
  downloads: number;
  lastUpdated: string;
  compatibility: string[];
  size: string;
  license: string;
  repository?: string;
  documentation?: string;
  examples?: string[];
}

interface WidgetMarketplaceProps {
  onClose?: () => void;
}

export function WidgetMarketplace({ onClose }: WidgetMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating' | 'name'>('popular');
  const [widgets, setWidgets] = useState<WidgetPackage[]>([]);
  const [filteredWidgets, setFilteredWidgets] = useState<WidgetPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  const { addWidget, activeSheetId } = useWorkspaceStore();
  const { toast } = useToast();

  // Mock widget data - in production this would come from a registry API
  useEffect(() => {
    const mockWidgets: WidgetPackage[] = [
      {
        id: 'advanced-chart',
        name: 'Advanced Chart',
        description: 'Professional financial charting with multiple indicators and timeframes',
        version: '2.1.0',
        author: 'MAD LAB Team',
        category: 'charts',
        tags: ['chart', 'financial', 'technical-analysis', 'indicators'],
        rating: 4.8,
        downloads: 15420,
        lastUpdated: '2025-01-15',
        compatibility: ['v1.0+'],
        size: '45.2 KB',
        license: 'MIT',
        repository: 'https://github.com/madlab/advanced-chart',
        documentation: 'https://docs.madlab.ai/widgets/advanced-chart',
        examples: ['Basic Chart', 'With Indicators', 'Custom Styling'],
      },
      {
        id: 'portfolio-tracker',
        name: 'Portfolio Tracker',
        description: 'Real-time portfolio performance monitoring and analysis',
        version: '1.5.2',
        author: 'Financial Tools Inc',
        category: 'portfolio',
        tags: ['portfolio', 'tracking', 'performance', 'real-time'],
        rating: 4.6,
        downloads: 8920,
        lastUpdated: '2025-01-10',
        compatibility: ['v1.0+'],
        size: '32.8 KB',
        license: 'Apache-2.0',
        repository: 'https://github.com/financial-tools/portfolio-tracker',
        examples: ['Basic Portfolio', 'With Benchmarks', 'Risk Analysis'],
      },
      {
        id: 'risk-calculator',
        name: 'Risk Calculator',
        description: 'Comprehensive risk assessment tools for investment analysis',
        version: '1.2.1',
        author: 'Risk Analytics Pro',
        category: 'risk',
        tags: ['risk', 'calculation', 'var', 'stress-testing'],
        rating: 4.9,
        downloads: 6780,
        lastUpdated: '2025-01-12',
        compatibility: ['v1.0+'],
        size: '28.5 KB',
        license: 'MIT',
        examples: ['VaR Calculation', 'Stress Testing', 'Scenario Analysis'],
      },
      {
        id: 'news-feed',
        name: 'Financial News Feed',
        description: 'Real-time financial news and market sentiment analysis',
        version: '1.0.3',
        author: 'News Aggregator Ltd',
        category: 'news',
        tags: ['news', 'sentiment', 'real-time', 'market'],
        rating: 4.4,
        downloads: 4560,
        lastUpdated: '2025-01-08',
        compatibility: ['v1.0+'],
        size: '18.9 KB',
        license: 'GPL-3.0',
        examples: ['News Feed', 'Sentiment Analysis', 'Custom Sources'],
      },
      {
        id: 'correlation-matrix',
        name: 'Correlation Matrix',
        description: 'Asset correlation analysis and visualization',
        version: '1.1.0',
        author: 'DataViz Experts',
        category: 'analysis',
        tags: ['correlation', 'matrix', 'visualization', 'assets'],
        rating: 4.7,
        downloads: 3420,
        lastUpdated: '2025-01-05',
        compatibility: ['v1.0+'],
        size: '22.1 KB',
        license: 'MIT',
        examples: ['Basic Matrix', 'Heatmap View', 'Interactive'],
      },
    ];

    setWidgets(mockWidgets);
    setFilteredWidgets(mockWidgets);
    setLoading(false);
  }, []);

  // Filter and sort widgets
  useEffect(() => {
    const filtered = widgets.filter((widget) => {
      const matchesSearch =
        widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        widget.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort widgets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.downloads - a.downloads;
        case 'recent':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredWidgets(filtered);
  }, [widgets, searchQuery, selectedCategory, sortBy]);

  const handleInstall = async (widget: WidgetPackage) => {
    setInstalling(widget.id);

    try {
      // Simulate installation process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Add widget to active sheet
      const sheetId = activeSheetId as string | undefined;
      if (sheetId) {
        addWidget(sheetId, {
          type: widget.id,
          title: widget.name,
          layout: { i: '', x: 0, y: 0, w: 6, h: 4 },
          props: {},
        });
      }

      // Show success toast
      toast({
        title: 'Installation Complete!',
        description: `${widget.name} has been successfully installed to your workspace.`,
        variant: 'default',
      });

      console.log(`Widget ${widget.name} installed successfully`);
    } catch (error) {
      // Show error toast
      toast({
        title: 'Installation Failed',
        description: `Failed to install ${widget.name}. Please try again.`,
        variant: 'destructive',
      });
      console.error(`Failed to install widget ${widget.name}:`, error);
    } finally {
      setInstalling(null);
    }
  };

  const handleOpenDocs = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'charts', name: 'Charts & Visualization' },
    { id: 'portfolio', name: 'Portfolio Management' },
    { id: 'risk', name: 'Risk Analysis' },
    { id: 'news', name: 'News & Sentiment' },
    { id: 'analysis', name: 'Data Analysis' },
    { id: 'trading', name: 'Trading Tools' },
    { id: 'custom', name: 'Custom Widgets' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Widget Marketplace</h2>
          <p className="text-sm text-muted-foreground">
            Discover and install widgets for your financial analysis workspace
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value: 'popular' | 'recent' | 'rating' | 'name') => setSortBy(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="name">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Widget Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredWidgets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No widgets found matching your criteria.</p>
            <Button variant="outline" onClick={() => setSearchQuery('')} className="mt-2">
              Clear filters
            </Button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {filteredWidgets.map((widget) => (
              <Card
                key={widget.id}
                className="h-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{widget.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {widget.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {widget.rating}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {widget.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      v{widget.version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {widget.downloads.toLocaleString()} downloads
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>By {widget.author}</span>
                      <span>{widget.size}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {widget.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {widget.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{widget.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
                        onClick={() => handleInstall(widget)}
                        disabled={installing === widget.id}
                      >
                        {installing === widget.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Install
                          </>
                        )}
                      </Button>

                      {widget.documentation && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDocs(widget.documentation!)}
                          className="flex items-center gap-1 focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Docs
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t text-center text-sm text-muted-foreground">
        <p>
          Can't find what you're looking for?{' '}
          <Button variant="link" className="p-0 h-auto text-sm">
            Create a custom widget
          </Button>{' '}
          or{' '}
          <Button variant="link" className="p-0 h-auto text-sm">
            request a new widget
          </Button>
        </p>
      </div>
    </div>
  );
}
