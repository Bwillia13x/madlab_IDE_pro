'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SheetKind } from '@/lib/store';
import { SHEET_PRESETS } from '@/lib/presets';

interface PresetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (kind: SheetKind) => void;
  children: React.ReactNode; // trigger
}

export function PresetPicker({ open, onOpenChange, onSelect, children }: PresetPickerProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {Object.entries(SHEET_PRESETS).map(([kind, preset]) => (
          <DropdownMenuItem
            key={kind}
            onClick={() => onSelect(kind as SheetKind)}
            className="flex flex-col items-start gap-1 p-3"
          >
            <div className="font-medium">{preset.label}</div>
            <div className="text-xs text-muted-foreground">{preset.description}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
