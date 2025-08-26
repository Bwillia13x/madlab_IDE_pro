'use client';

import { Search, Save, RotateCcw, Play, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceStore } from '@/lib/store';
import { useRef } from 'react';
import { useTheme } from 'next-themes';
import { saveActiveSheetLayout, restoreActiveSheetLayout, resetActiveSheetLayout } from '@/lib/ui/layoutPersistence';
import { toast } from 'sonner';

export function TitleBar() {
  const { sheets, activeSheetId, exportWorkspace, importWorkspace, theme, setTheme } = useWorkspaceStore();
  const activeSheet = sheets.find(s => s.id === activeSheetId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { setTheme: setNextTheme } = useTheme();

  const handleSaveLayout = () => {
    const ok = saveActiveSheetLayout();
    if (ok) {
      toast.success('Layout saved');
    } else {
      toast.error('No active sheet to save');
    }
  };

  const handleRestoreLayout = () => {
    const ok = restoreActiveSheetLayout();
    if (ok) {
      toast.success('Layout restored');
    } else {
      toast.warning('No saved layout for this sheet');
    }
  };

  const handleResetLayout = () => {
    const ok = resetActiveSheetLayout();
    if (ok) {
      toast.success('Layout reset');
    } else {
      toast.error('Unable to reset layout');
    }
  };

  const handleRunTests = () => {
    // TODO: Implement test runner
    console.log('Run tests');
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as typeof theme);
    setNextTheme(newTheme);
  };

  const handleExport = () => {
    try {
      const json = exportWorkspace();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `madlab-workspace-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Workspace exported');
    } catch (_e) {
      toast.error('Export failed');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ok = importWorkspace(JSON.parse(text));
      if (!ok) toast.error('Import failed: invalid data');
      else toast.success('Workspace imported');
    } catch (_err) {
      toast.error('Import error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-14 bg-gradient-to-r from-background/95 to-background/98 border-b border-border/50 backdrop-blur-xl flex items-center gap-3 px-3 text-sm select-none">
      {/* Left: Gem icon + App name + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-md bg-gradient-to-r from-primary via-accent to-secondary shadow-lg shadow-primary/50" />
        <div className="font-bold tracking-wide">MAD LAB — Workbench</div>
        <div className="text-muted-foreground text-xs">
          Workbench ▸ <span className="font-semibold text-foreground">
            {activeSheet?.title || 'Valuation'}
          </span>
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-sm mx-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files / commands"
            className="pl-8 pr-16 h-8 bg-card/50 border-border/50"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <span className="text-xs px-1.5 py-0.5 bg-muted/50 rounded border text-muted-foreground">⌘K</span>
          </div>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveLayout}
          className="h-8 px-3 text-xs"
        >
          <Save className="w-3 h-3 mr-1" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestoreLayout}
          className="h-8 px-3 text-xs"
        >
          Restore
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetLayout}
          className="h-8 px-3 text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-8 px-3 text-xs"
        >
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          className="h-8 px-3 text-xs"
        >
          <Upload className="w-3 h-3 mr-1" />
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
        >
          Lint
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
        >
          Format
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleRunTests}
          className="h-8 px-3 text-xs bg-primary hover:bg-primary/90"
        >
          <Play className="w-3 h-3 mr-1" />
          Run Tests
        </Button>
        <Select value={theme} onValueChange={handleThemeChange}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="malibu-sunrise">Malibu — Sunrise</SelectItem>
            <SelectItem value="malibu-sunset">Malibu — Sunset</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
