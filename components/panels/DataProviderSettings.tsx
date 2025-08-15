'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceStore } from '@/lib/store';
import { getAlphaVantageKey, setAlphaVantageKey } from '@/lib/data/apiKeys';
import { dataProviderRegistry, registerDataProvider } from '@/lib/data/providers';
import { alphaVantageProvider } from '@/lib/data/providers/AlphaVantageProvider';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataProviderSettings({ open, onOpenChange }: Props) {
  const current = useWorkspaceStore((s) => s.dataProvider);
  const setProvider = useWorkspaceStore((s) => s.setDataProvider);
  const [alphaKey, setAlphaKey] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setAlphaKey(getAlphaVantageKey() || '');
  }, [open]);

  const save = async () => {
    setAlphaVantageKey(alphaKey.trim() || null);
    // Register Alpha Vantage provider lazily
    try {
      if (!dataProviderRegistry.getProvider('alpha-vantage')) {
        registerDataProvider('alpha-vantage', alphaVantageProvider);
      }
      setStatus('Saved');
    } catch {
      setStatus('Error saving key');
    }
  };

  const switchToAlpha = async () => {
    await save();
    await setProvider('alpha-vantage');
    onOpenChange(false);
  };

  const switchToMock = async () => {
    await setProvider('mock');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Data Providers</DialogTitle>
          <DialogDescription>Manage API keys and switch providers</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="alphaKey">Alpha Vantage API Key</Label>
            <Input
              id="alphaKey"
              type="password"
              value={alphaKey}
              onChange={(e) => setAlphaKey(e.target.value)}
              placeholder="Enter key"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Stored locally for browser usage
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>
              Save Key
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAlphaKey('');
                setAlphaVantageKey(null);
              }}
            >
              Clear
            </Button>
            <div className="text-xs text-muted-foreground self-center">{status}</div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={switchToAlpha} disabled={!alphaKey}>
              Use Alpha Vantage
            </Button>
            <Button size="sm" variant="secondary" onClick={switchToMock}>
              Use Mock
            </Button>
            <div className="text-xs text-muted-foreground self-center">Current: {current}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
