'use client';

import { Search, Save, RotateCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceStore } from '@/lib/store';
import { useState } from 'react';

export function TitleBar() {
  const { sheets, activeSheetId } = useWorkspaceStore();
  const activeSheet = sheets.find(s => s.id === activeSheetId);
  const [theme, setTheme] = useState('malibu-sunrise');

  const handleSaveLayout = () => {
    if (!activeSheetId) return;
    const sheet = sheets.find(s => s.id === activeSheetId);
    if (!sheet) return;
    
    // Save current layout to localStorage
    const layoutData = sheet.widgets.map(w => ({ id: w.id, layout: w.layout }));
    localStorage.setItem(`madlab_layout_${activeSheetId}`, JSON.stringify(layoutData));
    console.log('Layout saved for sheet:', activeSheetId);
  };

  const handleRestoreLayout = () => {
    if (!activeSheetId) return;
    
    // Restore layout from localStorage
    const saved = localStorage.getItem(`madlab_layout_${activeSheetId}`);
    if (!saved) {
      console.log('No saved layout found for this sheet');
      return;
    }
    
    try {
      const layoutData = JSON.parse(saved);
      // TODO: Apply the restored layout to widgets
      console.log('Layout restored for sheet:', activeSheetId, layoutData);
    } catch (e) {
      console.error('Failed to restore layout:', e);
    }
  };

  const handleResetLayout = () => {
    if (!activeSheetId) return;
    
    // Remove saved layout and reset to defaults
    localStorage.removeItem(`madlab_layout_${activeSheetId}`);
    // TODO: Reset widgets to default positions
    console.log('Layout reset for sheet:', activeSheetId);
  };

  const handleRunTests = () => {
    // TODO: Implement test runner
    console.log('Run tests');
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.body.className = document.body.className.replace(/malibu-\w+/g, '');
    document.body.classList.add(newTheme);
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