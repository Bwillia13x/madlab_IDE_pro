'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Download, 
 
  Star, 
  Users, 
  TrendingUp, 
  BarChart3,
  Settings,
  Share2,
  Heart,
  Eye
} from 'lucide-react';
import { MARKETPLACE_TEMPLATES } from '@/lib/marketplace/templates';
import { useWorkspaceStore } from '@/lib/store';
import { TemplateUploadDialog } from '@/components/marketplace/TemplateUploadDialog';

interface MarketplacePanelProps {
  onClose?: () => void;
}

type TemplateCategory = 'all' | 'charting' | 'options' | 'risk' | 'trading' | 'analysis';

export function MarketplacePanel({ onClose }: MarketplacePanelProps) {
  const { createSheetFromWorkflow, globalSymbol } = useWorkspaceStore();
  const [installing, setInstalling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating'>('popular');

  const filteredTemplates = useMemo(() => {
    const filtered = MARKETPLACE_TEMPLATES.filter(template => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || template.kind === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort templates
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  const installTemplate = async (id: string) => {
    const tpl = MARKETPLACE_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setInstalling(id);
    const widgets = tpl.widgets.map((w) => ({
      ...w,
      props: { ...(w.props || {}), symbol: globalSymbol },
    }));
    createSheetFromWorkflow(tpl.title, tpl.kind, widgets);
    setInstalling(null);
    onClose?.();
  };

  const shareTemplate = (id: string) => {
    const tpl = MARKETPLACE_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    
    // Generate shareable link (in a real app, this would create a unique URL)
    const shareData = {
      title: tpl.title,
      text: tpl.description,
      url: `${window.location.origin}/marketplace/template/${id}`
    };
    
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(shareData.url);
      // You could show a toast notification here
    }
  };

  const categories: { value: TemplateCategory; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', icon: <BarChart3 className="w-4 h-4" /> },
    { value: 'charting', label: 'Charting', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'options', label: 'Options', icon: <Settings className="w-4 h-4" /> },
    { value: 'risk', label: 'Risk', icon: <BarChart3 className="w-4 h-4" /> },
    { value: 'trading', label: 'Trading', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'analysis', label: 'Analysis', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Marketplace
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => shareTemplate('all')}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            <TemplateUploadDialog onUploadComplete={() => {
              // Refresh marketplace data if needed
            }} />
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TemplateCategory)}>
              <TabsList className="grid w-full grid-cols-6">
                {categories.map((category) => (
                  <TabsTrigger key={category.value} value={category.value} className="flex items-center gap-1">
                    {category.icon}
                    <span className="hidden sm:inline">{category.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'newest' | 'rating')}
              className="text-sm border rounded px-2 py-1"
              aria-label="Sort templates by"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-full">
        <ScrollArea className="h-[60vh] pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => (
              <Card key={tpl.id} className="group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{tpl.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {tpl.kind}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Template Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{tpl.rating || 4.5}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{tpl.downloads || Math.floor(Math.random() * 1000) + 100}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{tpl.views || Math.floor(Math.random() * 5000) + 500}</span>
                    </div>
                  </div>
                  
                  {/* Widget Preview */}
                  <div className="grid grid-cols-2 gap-1 mb-3">
                    {tpl.widgets.slice(0, 4).map((widget, index) => (
                      <div
                        key={index}
                        className="h-8 bg-muted rounded text-xs flex items-center justify-center text-muted-foreground"
                      >
                        {widget.type}
                      </div>
                    ))}
                    {tpl.widgets.length > 4 && (
                      <div className="h-8 bg-muted rounded text-xs flex items-center justify-center text-muted-foreground">
                        +{tpl.widgets.length - 4}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => installTemplate(tpl.id)} 
                      disabled={installing === tpl.id}
                      className="flex-1"
                    >
                      {installing === tpl.id ? 'Adding…' : 'Add to Workspace'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => shareTemplate(tpl.id)}
                      className="px-2"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="px-2"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No templates found matching your criteria.</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


