'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DemoBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed top-2 right-3 z-50 bg-gradient-to-r from-accent via-primary to-secondary text-background px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg flex items-center gap-2">
      DEMO MODE — mock data only
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setVisible(false)}
        className="h-4 w-4 p-0 hover:bg-background/20 text-background/80 hover:text-background"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}