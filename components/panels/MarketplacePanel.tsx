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
import { getSchemaWidget } from '@/lib/widgets/registry';
import { useWorkspaceStore, type SheetKind } from '@/lib/store';
import { TemplateUploadDialog } from '@/components/marketplace/TemplateUploadDialog';

interface MarketplacePanelProps {
  onClose?: () => void;
}

type TemplateCategory = 'all' | SheetKind;

export function MarketplacePanel({ onClose }: MarketplacePanelProps) {
  const { createSheetFromWorkflow, addWidget, setActiveSheet, sheets, globalSymbol, getGlobalTimeframe } = useWorkspaceStore();
  const [installing, setInstalling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating' | 'downloads' | 'views' | 'a-z'>('popular');
  const [targetSheetId, setTargetSheetId] = useState<'new' | string>('new');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of MARKETPLACE_TEMPLATES) {
      (t.tags || []).forEach(tag => set.add(tag));
    }
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, []);

  const filteredTemplates = useMemo(() => {
    const filtered = MARKETPLACE_TEMPLATES.filter(template => {
      const lcQuery = searchQuery.toLowerCase();
      const matchesSearch =
        template.title.toLowerCase().includes(lcQuery) ||
        template.description.toLowerCase().includes(lcQuery) ||
        (template.tags || []).join(' ').toLowerCase().includes(lcQuery);
      const matchesCategory = selectedCategory === 'all' || template.kind === selectedCategory;
      const matchesTags = selectedTags.length === 0 || (template.tags || []).some(tag => selectedTags.includes(tag));
      return matchesSearch && matchesCategory && matchesTags;
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
      case 'downloads':
        filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
      case 'views':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'a-z':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  const installTemplate = async (id: string) => {
    const tpl = MARKETPLACE_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setInstalling(id);
    const widgets = tpl.widgets.map((w) => {
      const schema = getSchemaWidget(w.type);
      const supportsSymbol = Boolean(schema?.props?.symbol);
      const supportsRange = Boolean(schema?.props?.range);
      const nextProps: Record<string, unknown> = { ...(w.props || {}) };
      if (supportsSymbol) nextProps.symbol = globalSymbol;
      if (supportsRange) nextProps.range = getGlobalTimeframe();
      return { ...w, props: nextProps };
    });
    if (targetSheetId === 'new') {
      const sheetId = createSheetFromWorkflow(tpl.title, tpl.kind, widgets);
      setInstalling(null);
      if (sheetId) {
        const url = new URL(window.location.href);
        url.searchParams.set('sheet', sheetId);
        window.history.replaceState({}, '', url.toString());
      }
      onClose?.();
      return;
    }
    // Add to existing sheet
    for (const w of widgets) {
      addWidget(targetSheetId, w);
    }
    setActiveSheet(targetSheetId);
    setInstalling(null);
    const url = new URL(window.location.href);
    url.searchParams.set('sheet', targetSheetId);
    window.history.replaceState({}, '', url.toString());
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

  const shareMarketplace = () => {
    const url = `${window.location.origin}/marketplace`;
    if (navigator.share) {
      navigator.share({ title: 'MAD LAB Marketplace', text: 'Explore templates', url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };
  // Build categories dynamically from available template kinds
  const categories: { value: TemplateCategory; label: string; icon: React.ReactNode }[] = useMemo(() => {
    const kinds = Array.from(new Set<SheetKind>(MARKETPLACE_TEMPLATES.map(t => t.kind)));
    const iconFor = (kind: SheetKind) => {
      switch (kind) {
        case 'charting': return <TrendingUp className="w-4 h-4" />;
        case 'options': return <Settings className="w-4 h-4" />;
        case 'risk': return <BarChart3 className="w-4 h-4" />;
        case 'portfolio': return <Users className="w-4 h-4" />;
        case 'valuation': return <BarChart3 className="w-4 h-4" />;
        case 'screening': return <Search className="w-4 h-4" />;
        default: return <BarChart3 className="w-4 h-4" />;
      }
    };
    const labelFor = (kind: SheetKind) => kind.charAt(0).toUpperCase() + kind.slice(1);
    return [
      { value: 'all', label: 'All', icon: <BarChart3 className="w-4 h-4" /> },
      ...kinds.map(k => ({ value: k, label: labelFor(k), icon: iconFor(k) })),
    ];
  }, []);

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Marketplace
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={shareMarketplace}>
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
          
          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                >
                  <Badge variant={selectedTags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer text-xs">{tag}</Badge>
                </button>
              ))}
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>Clear tags</Button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border rounded px-2 py-1"
              aria-label="Sort templates by"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="downloads">Most Downloaded</option>
              <option value="views">Most Viewed</option>
              <option value="a-z">A → Z</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Target:</span>
              <select
                value={targetSheetId}
                onChange={(e) => setTargetSheetId(e.target.value as 'new' | string)}
                className="text-sm border rounded px-2 py-1"
                aria-label="Target sheet"
              >
                <option value="new">Create new sheet</option>
                {sheets.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">{filteredTemplates.length} results</span>
            </div>
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

