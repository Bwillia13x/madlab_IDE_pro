'use client';

import { useState, useEffect } from 'react';
import { Settings, Trash2, ToggleLeft, ToggleRight, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  marketplaceManager, 
  type WidgetInstallation, 
  type MarketplaceWidget 
} from '@/lib/marketplace';
import { analytics } from '@/lib/analytics';
import { toast } from 'sonner';

interface WidgetManagerProps {
  onClose?: () => void;
}

export function WidgetManager({ onClose }: WidgetManagerProps) {
  const [installedWidgets, setInstalledWidgets] = useState<WidgetInstallation[]>([]);
  const [availableUpdates, setAvailableUpdates] = useState<Array<{ widgetId: string; currentVersion: string; newVersion: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [uninstalling, setUninstalling] = useState<Set<string>>(new Set());

  // Load installed widgets and check for updates
  useEffect(() => {
    const loadData = async () => {
      try {
        await marketplaceManager.initialize();
        const installed = marketplaceManager.getInstalledWidgets();
        const updates = await marketplaceManager.checkForUpdates();
        
        setInstalledWidgets(installed);
        setAvailableUpdates(updates);
        setLoading(false);
      } catch (error) {
        console.error('[WidgetManager] Failed to load data:', error);
        toast.error('Failed to load widget data');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle widget toggle
  const handleToggle = async (widgetId: string, enabled: boolean) => {
    try {
      marketplaceManager.toggleWidget(widgetId, enabled);
      setInstalledWidgets(prev => 
        prev.map(widget => 
          widget.widgetId === widgetId 
            ? { ...widget, enabled }
            : widget
        )
      );
      
      const widgetDetails = marketplaceManager.getWidgetDetails(widgetId);
      toast.success(`${widgetDetails?.displayName || widgetId} ${enabled ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Toggle failed';
      toast.error(errorMessage);
    }
  };

  // Handle widget uninstall
  const handleUninstall = async (widgetId: string) => {
    setUninstalling(prev => {
      const next = new Set(prev);
      next.add(widgetId);
      return next;
    });
    
    try {
      await marketplaceManager.uninstallWidget(widgetId);
      setInstalledWidgets(prev => prev.filter(widget => widget.widgetId !== widgetId));
      
      const widgetDetails = marketplaceManager.getWidgetDetails(widgetId);
      toast.success(`${widgetDetails?.displayName || widgetId} uninstalled successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Uninstall failed';
      toast.error(errorMessage);
    } finally {
      setUninstalling(prev => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });
    }
  };

  // Handle widget update
  const handleUpdate = async (widgetId: string) => {
    setUpdating(prev => {
      const next = new Set(prev);
      next.add(widgetId);
      return next;
    });
    
    try {
      // Re-install with latest version
      await marketplaceManager.installWidget(widgetId);
      
      // Refresh data
      const installed = marketplaceManager.getInstalledWidgets();
      const updates = await marketplaceManager.checkForUpdates();
      setInstalledWidgets(installed);
      setAvailableUpdates(updates);
      
      const widgetDetails = marketplaceManager.getWidgetDetails(widgetId);
      toast.success(`${widgetDetails?.displayName || widgetId} updated successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      toast.error(errorMessage);
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">Loading installed widgets...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with hover-reveal actions (progressive disclosure) */}
      <div className="border-b border-border p-4 group">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Widget Manager</h2>
            <p className="text-sm text-muted-foreground">
              Manage your installed widgets and check for updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {installedWidgets.length} widgets installed
              {availableUpdates.length > 0 && (
                <span className="ml-2 text-orange-600">
                  • {availableUpdates.length} updates available
                </span>
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Back to top
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="installed" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed" className="relative">
            Installed
            {installedWidgets.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {installedWidgets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="updates" className="relative">
            Updates
            {availableUpdates.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {availableUpdates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="flex-1 overflow-auto p-4">
          {installedWidgets.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No widgets installed</h3>
              <p className="text-muted-foreground">
                Browse the marketplace to install your first widget
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {installedWidgets.map((installation) => (
                <InstalledWidgetCard
                  key={installation.widgetId}
                  installation={installation}
                  isUninstalling={uninstalling.has(installation.widgetId)}
                  onToggle={handleToggle}
                  onUninstall={handleUninstall}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="updates" className="flex-1 overflow-auto p-4">
          {availableUpdates.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All widgets are up to date</h3>
              <p className="text-muted-foreground">
                Your widgets are running the latest versions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableUpdates.map((update) => (
                <UpdateCard
                  key={update.widgetId}
                  update={update}
                  isUpdating={updating.has(update.widgetId)}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface InstalledWidgetCardProps {
  installation: WidgetInstallation;
  isUninstalling: boolean;
  onToggle: (widgetId: string, enabled: boolean) => void;
  onUninstall: (widgetId: string) => void;
}

function InstalledWidgetCard({ installation, isUninstalling, onToggle, onUninstall }: InstalledWidgetCardProps) {
  const widgetDetails = marketplaceManager.getWidgetDetails(installation.widgetId);
  
  if (!widgetDetails) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm">Widget not found: {installation.widgetId}</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={isUninstalling}
            onClick={() => onUninstall(installation.widgetId)}
            className="ml-auto"
          >
            Remove
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{widgetDetails.icon}</span>
          <div>
            <h3 className="font-medium text-sm">{widgetDetails.displayName}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>v{installation.version}</span>
              <span>•</span>
              <span>by {widgetDetails.author.name}</span>
              <span>•</span>
              <span>Installed {new Date(installation.installedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Enable/Disable toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={installation.enabled}
              onCheckedChange={(enabled) => onToggle(installation.widgetId, enabled)}
            />
            <span className="text-xs text-muted-foreground">
              {installation.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {/* Settings button */}
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0"
            title="Widget Settings"
          >
            <Settings className="h-3 w-3" />
          </Button>

          {/* Uninstall button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={isUninstalling}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                title="Uninstall Widget"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Uninstall {widgetDetails.displayName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the widget and all its data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onUninstall(installation.widgetId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Uninstall
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}

interface UpdateCardProps {
  update: { widgetId: string; currentVersion: string; newVersion: string };
  isUpdating: boolean;
  onUpdate: (widgetId: string) => void;
}

function UpdateCard({ update, isUpdating, onUpdate }: UpdateCardProps) {
  const widgetDetails = marketplaceManager.getWidgetDetails(update.widgetId);

  if (!widgetDetails) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{widgetDetails.icon}</span>
          <div>
            <h3 className="font-medium text-sm">{widgetDetails.displayName}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>v{update.currentVersion}</span>
              <span>→</span>
              <span className="text-green-600 font-medium">v{update.newVersion}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {widgetDetails.description}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          disabled={isUpdating}
          onClick={() => onUpdate(update.widgetId)}
        >
          <Download className="h-3 w-3 mr-1" />
          {isUpdating ? 'Updating...' : 'Update'}
        </Button>
      </div>
    </Card>
  );
}