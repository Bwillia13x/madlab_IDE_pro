'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Star,
  Shield,
  Clock,
  Package,
  Tags,
  DollarSign,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
// Tabs UI is not used here; remove to satisfy CI lint strictness
import {
  marketplaceManager,
  type MarketplaceWidget,
  type MarketplaceFilter,
  type WidgetCategory,
} from '@/lib/marketplace';
import { useWorkspaceStore } from '@/lib/store';
import { analytics } from '@/lib/analytics';
import { toast } from 'sonner';

interface MarketplaceBrowserProps {
  onWidgetInstall?: (widget: MarketplaceWidget) => void;
  onClose?: () => void;
}

export function MarketplaceBrowser({ onWidgetInstall, onClose }: MarketplaceBrowserProps) {
  const [widgets, setWidgets] = useState<MarketplaceWidget[]>([]);
  const [filteredWidgets, setFilteredWidgets] = useState<MarketplaceWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const { onboardingCompleted } = useWorkspaceStore();
  const learningProgress = useWorkspaceStore((s) => s.learningProgress);
  const [showRec, setShowRec] = useState<boolean>(() => {
    try {
      return localStorage.getItem('madlab_market_rec_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  // Filter state
  const [filter, setFilter] = useState<MarketplaceFilter>({
    search: '',
    category: undefined,
    priceType: 'all',
    rating: 0,
    verified: undefined,
    sortBy: 'popularity',
    sortOrder: 'desc',
  });

  // Initialize marketplace
  useEffect(() => {
    const init = async () => {
      try {
        await marketplaceManager.initialize();
        const allWidgets = marketplaceManager.searchWidgets();
        setWidgets(allWidgets);
        setFilteredWidgets(allWidgets);
        setLoading(false);
      } catch (error) {
        console.error('[MarketplaceBrowser] Initialization failed:', error);
        toast.error('Failed to load marketplace');
        setLoading(false);
      }
    };

    init();
  }, []);

  // Apply filters
  useEffect(() => {
    const base = marketplaceManager.searchWidgets(filter);
    // Progressive revelation: when not onboarded, prefer beginner-friendly widgets
    const beginnerFirst = onboardingCompleted
      ? base
      : base.sort((a, b) => {
          const aAdv = (a.tags || []).some((t) => /advanced|options|risk|derivative/i.test(t));
          const bAdv = (b.tags || []).some((t) => /advanced|options|risk|derivative/i.test(t));
          if (aAdv === bAdv) return 0;
          return aAdv ? 1 : -1;
        });
    // Recommended band: surface a small curated subset on top based on learningProgress
    const recommended = beginnerFirst
      .filter((w) => {
        if (!learningProgress?.configuredWidget)
          return /kpi|table|markdown|chart/i.test(w.displayName + ' ' + (w.tags || []).join(' '));
        if (!learningProgress?.exportedWorkspace)
          return /export|table|chart/i.test(w.description + ' ' + (w.tags || []).join(' '));
        if (!learningProgress?.savedTemplate)
          return /template|snapshot|save/i.test(w.description + ' ' + (w.tags || []).join(' '));
        return /options|risk|greeks|var/i.test(w.displayName + ' ' + (w.tags || []).join(' '));
      })
      .slice(0, 3);
    // De-duplicate
    const ids = new Set(recommended.map((r) => r.id));
    const rest = beginnerFirst.filter((w) => !ids.has(w.id));
    setFilteredWidgets([...recommended, ...rest]);
  }, [filter, onboardingCompleted]);

  // Handle widget installation
  const handleInstall = async (widget: MarketplaceWidget) => {
    setInstalling((prev) => {
      const next = new Set(prev);
      next.add(widget.id);
      return next;
    });

    try {
      await marketplaceManager.installWidget(widget.id);
      toast.success(`${widget.displayName} installed successfully!`);
      onWidgetInstall?.(widget);
      try {
        useWorkspaceStore.getState().celebrate?.('Widget installed');
        useWorkspaceStore
          .getState()
          .safeUpdate?.({
            learningProgress: {
              ...useWorkspaceStore.getState().learningProgress,
              installedWidget: true,
            },
          });
      } catch {}

      analytics.track(
        'marketplace_widget_installed',
        {
          widget_id: widget.id,
          widget_name: widget.displayName,
          category: widget.category,
        },
        'feature_usage'
      );
      try {
        if (
          typeof localStorage !== 'undefined' &&
          localStorage.getItem('madlab_first_install') !== 'true'
        ) {
          const { getOnboardingVariant } = require('@/lib/analytics/experiments');
          analytics.track(
            'conversion',
            { event: 'first_install', variant: getOnboardingVariant() },
            'user_flow'
          );
          localStorage.setItem('madlab_first_install', 'true');
        }
      } catch {}
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Installation failed';
      toast.error(`Failed to install ${widget.displayName}: ${errorMessage}`);
    } finally {
      setInstalling((prev) => {
        const newSet = new Set(prev);
        newSet.delete(widget.id);
        return newSet;
      });
    }
  };

  // Get marketplace stats
  const stats = useMemo(() => {
    try {
      if (widgets.length === 0) return null;
      return marketplaceManager.getMarketplaceStats();
    } catch {
      return null;
    }
  }, [widgets.length]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">Loading marketplace...</div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col">
      {/* Header with hover-reveal actions */}
      <div className="border-b border-border p-4 group">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Widget Marketplace</h2>
            <p className="text-sm text-muted-foreground">
              Discover and install widgets to enhance your workbench
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <div className="text-xs text-muted-foreground">
                {stats.totalWidgets} widgets available • {stats.installedWidgets} installed
              </div>
            )}
            <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Back to top
              </Button>
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search widgets..."
                value={filter.search || ''}
                onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" className="px-3">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <Select
              value={filter.category || 'all'}
              onValueChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  category: value === 'all' ? undefined : (value as WidgetCategory),
                }))
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="charts">Charts</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="risk_management">Risk Management</SelectItem>
                <SelectItem value="options_trading">Options Trading</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.priceType || 'all'}
              onValueChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  priceType: value === 'all' ? 'all' : (value as 'free' | 'paid'),
                }))
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.sortBy || 'popularity'}
              onValueChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  sortBy: value as MarketplaceFilter['sortBy'],
                }))
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                id="verified-only"
                checked={filter.verified || false}
                onCheckedChange={(checked) =>
                  setFilter((prev) => ({
                    ...prev,
                    verified: checked ? true : undefined,
                  }))
                }
              />
              <label htmlFor="verified-only" className="text-xs">
                Verified
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended for you */}
      {filteredWidgets.length > 0 && showRec && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-muted-foreground">Recommended for you</div>
            <button
              type="button"
              className="text-[11px] underline text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowRec(false);
                try {
                  localStorage.setItem('madlab_market_rec_dismissed', 'true');
                } catch {}
              }}
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWidgets.slice(0, 3).map((widget) => (
              <WidgetCard
                key={`rec-${widget.id}`}
                widget={widget}
                isInstalling={installing.has(widget.id)}
                onInstall={() => handleInstall(widget)}
                highlightBeginner={!onboardingCompleted}
              />
            ))}
          </div>
        </div>
      )}

      {/* Widget grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredWidgets.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No widgets found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or browse all categories
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWidgets.slice(3).map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                isInstalling={installing.has(widget.id)}
                onInstall={() => handleInstall(widget)}
                highlightBeginner={!onboardingCompleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface WidgetCardProps {
  widget: MarketplaceWidget;
  isInstalling: boolean;
  onInstall: () => void;
  highlightBeginner?: boolean;
}

function WidgetCard({ widget, isInstalling, onInstall, highlightBeginner }: WidgetCardProps) {
  const isInstalled = marketplaceManager
    .getInstalledWidgets()
    .some((installation) => installation.widgetId === widget.id);
  const learningProgress = useWorkspaceStore((s) => s.learningProgress);
  const gated = (() => {
    try {
      if ((widget.tags || []).some((t) => /options|greeks|derivative/i.test(t))) {
        return !(learningProgress?.configuredWidget && learningProgress?.exportedWorkspace);
      }
    } catch {}
    return false;
  })();

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{widget.icon}</span>
            <div>
              <h3 className="font-medium text-sm">{widget.displayName}</h3>
              <p className="text-xs text-muted-foreground">by {widget.author.name}</p>
            </div>
          </div>
          {widget.verified && (
            <Shield className="h-4 w-4 text-blue-500" aria-label="Verified widget" />
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">{widget.description}</p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{widget.rating}</span>
            <span>({widget.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            <span>{widget.downloads.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{widget.version}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {widget.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
              {tag}
            </Badge>
          ))}
          {widget.tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              +{widget.tags.length - 3}
            </Badge>
          )}
          {highlightBeginner && !(widget.tags || []).some((t) => /advanced/i.test(t)) && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 text-emerald-600 border-emerald-500"
            >
              beginner
            </Badge>
          )}
          {gated && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 text-yellow-700 border-yellow-600 inline-flex items-center gap-1"
              title="Unlock by completing: Configure a widget and Export workspace"
            >
              <Lock className="h-3 w-3" /> locked
            </Badge>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between">
          <div className="text-xs">
            {widget.pricing.type === 'free' ? (
              <Badge variant="outline" className="text-green-600">
                Free
              </Badge>
            ) : widget.pricing.type === 'paid' ? (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>{widget.pricing.price}</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-blue-600">
                Subscription
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            variant={isInstalled ? 'outline' : 'default'}
            disabled={isInstalling || isInstalled || gated}
            onClick={onInstall}
            className="text-xs h-6"
          >
            {gated
              ? 'Unlock by completing X'
              : isInstalling
                ? 'Installing...'
                : isInstalled
                  ? 'Installed'
                  : 'Install'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
