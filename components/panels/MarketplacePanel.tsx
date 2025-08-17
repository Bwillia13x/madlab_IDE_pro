'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MARKETPLACE_TEMPLATES } from '@/lib/marketplace/templates';
import { useWorkspaceStore } from '@/lib/store';

interface MarketplacePanelProps {
  onClose?: () => void;
}

export function MarketplacePanel({ onClose }: MarketplacePanelProps) {
  const { createSheetFromWorkflow, globalSymbol } = useWorkspaceStore();
  const [installing, setInstalling] = useState<string | null>(null);

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

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Marketplace</CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        <ScrollArea className="h-[60vh] pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MARKETPLACE_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="border rounded p-3 bg-background">
                <div className="text-sm font-medium">{tpl.title}</div>
                <div className="text-xs text-muted-foreground mb-2">{tpl.description}</div>
                <Button size="sm" onClick={() => installTemplate(tpl.id)} disabled={installing === tpl.id}>
                  {installing === tpl.id ? 'Adding…' : 'Add to workspace'}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


