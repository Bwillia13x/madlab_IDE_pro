'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Widget } from '@/lib/types';
import { SHEET_PRESETS, type SheetKind } from '@/lib/presets';
import { useWorkspaceStore } from '@/lib/store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle } from 'lucide-react';
import { getOnboardingVariant } from '@/lib/analytics/experiments';

interface PresetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (kind: SheetKind) => void;
  onSelectTemplate?: (name: string) => void;
  onSaveTemplate?: () => void;
  children: React.ReactNode; // trigger
}

export function PresetPicker({ open, onOpenChange, onSelect, onSelectTemplate, onSaveTemplate, children }: PresetPickerProps) {
  // compute each render; cheap and avoids stale templates
  let templates: { name: string; kind: SheetKind; title: string; widgets: Omit<Widget,'id'>[] }[] = [];
  try {
    templates = useWorkspaceStore.getState().getTemplates();
  } catch {
    templates = [];
  }
  const isAutomation = typeof navigator !== 'undefined' && (navigator as any).webdriver;
  // Gate advanced presets until onboarding completion to reduce cognitive load
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  useEffect(() => {
    try {
      setOnboardingDone(localStorage.getItem('madlab_onboarding_completed') === 'true');
    } catch { setOnboardingDone(true); }
  }, []);
  const recommendedKind = useMemo(() => {
    try {
      const s = useWorkspaceStore.getState();
      const lp = s.learningProgress;
      if (!lp?.configuredWidget) return 'valuation' as SheetKind;
      if (!lp?.exportedWorkspace) return 'valuation' as SheetKind;
      if (!lp?.savedTemplate) return 'charting' as SheetKind;
      if (lp?.configuredWidget && lp?.exportedWorkspace) return 'options' as SheetKind;
    } catch {}
    return undefined;
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent data-testid="preset-picker" align="start" className="w-80" forceMount>
        {onSaveTemplate && (
          <DropdownMenuItem data-testid="save-template" onClick={() => onSaveTemplate()} className="p-3">
            Save current sheet as template…
          </DropdownMenuItem>
        )}
        {onSaveTemplate && <DropdownMenuSeparator />}

        {templates.length > 0 && (
          <>
            <DropdownMenuLabel className="px-3">My Templates</DropdownMenuLabel>
            {templates.map((t) => (
              <DropdownMenuItem
                key={t.name}
                data-testid={`template-item-${t.name.replace(/\s+/g, '-')}`}
                onClick={() => onSelectTemplate?.(t.name)}
                className="flex flex-col items-start gap-1 p-3"
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.title}</div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="px-3">Presets</DropdownMenuLabel>
        {recommendedKind && (
          <>
            <div className="px-3 pt-1 pb-2 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Recommended for you</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent"
                    aria-label="Why is this recommended?"
                    aria-haspopup="dialog"
                    aria-controls="preset-recommended-help"
                    title="Why recommended?"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent id="preset-recommended-help" className="w-72 text-xs" side="right">
                  <div className="font-medium mb-1">Why recommended?</div>
                  <p className="text-muted-foreground">
                    We suggest presets based on your progression. Complete milestones to unlock advanced options. Next up is best aligned with your current status.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            {Object.entries(SHEET_PRESETS)
              .filter(([kind]) => kind === recommendedKind)
              .map(([kind, preset]) => {
                const isGated = (() => {
                  try {
                    const s = useWorkspaceStore.getState();
                    const lp = s.learningProgress;
                    if (kind === 'options') {
                      return !(lp?.configuredWidget && lp?.exportedWorkspace);
                    }
                    return false;
                  } catch { return false; }
                })();
                return (
                  <DropdownMenuItem
                    key={`rec-${kind}`}
                    data-testid={`preset-item-${kind}`}
                    onClick={() => { if (!isGated) onSelect(kind as SheetKind); }}
                    aria-disabled={isGated}
                    className={`flex flex-col items-start gap-1 p-3 ${isGated ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <div className="font-medium flex items-center gap-2">
                        {preset.label}
                        <span className="text-[10px] px-1 py-0.5 rounded border border-primary/30 text-primary/80">Recommended</span>
                      </div>
                       <Popover>
                         <PopoverTrigger asChild>
                           <button
                             type="button"
                             className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent"
                             aria-label={`Help for ${preset.label}`}
                             aria-haspopup="dialog"
                             aria-controls={`preset-help-${kind}`}
                             title={`What is ${preset.label}?`}
                           >
                             <HelpCircle className="h-3.5 w-3.5" />
                           </button>
                         </PopoverTrigger>
                         <PopoverContent id={`preset-help-${kind}`} className="w-72 text-xs" side="right">
                          <div className="font-medium mb-1">{preset.label}</div>
                          <p className="text-muted-foreground">{preset.description}</p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="text-xs text-muted-foreground w-full">
                      {preset.description}
                    </div>
                    {isGated && (
                      <div className="text-[11px] text-muted-foreground italic">Unlock by completing: Configure a widget and Export workspace</div>
                    )}
                  </DropdownMenuItem>
                );
              })}
            <DropdownMenuSeparator />
          </>
        )}
        <div className="px-3 pb-1 text-[11px] text-muted-foreground">
          Difficulty:
          <button className={`ml-2 underline-offset-2 ${difficultyFilter==='all'?'underline':''}`} onClick={() => setDifficultyFilter('all')}>All</button>
          <button className={`ml-2 underline-offset-2 ${difficultyFilter==='beginner'?'underline':''}`} onClick={() => setDifficultyFilter('beginner')}>Beginner</button>
          <button className={`ml-2 underline-offset-2 ${difficultyFilter==='intermediate'?'underline':''}`} onClick={() => setDifficultyFilter('intermediate')}>Intermediate</button>
          <button className={`ml-2 underline-offset-2 ${difficultyFilter==='advanced'?'underline':''}`} onClick={() => setDifficultyFilter('advanced')}>Advanced</button>
        </div>
        {Object.entries(SHEET_PRESETS)
          .filter(([kind]) => {
            // Example gating: hide advanced until onboarding done; allow if skill level advanced
            try {
              const s = useWorkspaceStore.getState();
              if (s.onboardingCompleted) return true;
              if (s.skillLevel === 'advanced') return true;
              if (kind === 'options') return false;
            } catch {}
            return true;
          })
          .filter(([kind]) => {
            if (difficultyFilter === 'all') return true;
            if (difficultyFilter === 'advanced') return kind === 'options' || kind === 'risk';
            if (difficultyFilter === 'beginner') return kind === 'valuation' || kind === 'charting' || kind === 'blank';
            if (difficultyFilter === 'intermediate') return kind === 'charting' || kind === 'valuation';
            return true;
          })
          .filter(([kind]) => kind !== recommendedKind)
          .map(([kind, preset]) => {
            const isGated = (() => {
              try {
                const s = useWorkspaceStore.getState();
                const lp = s.learningProgress;
                if (kind === 'options') {
                  // Unlock options after configuredWidget && exportedWorkspace
                  return !(lp?.configuredWidget && lp?.exportedWorkspace);
                }
                return false;
              } catch { return false; }
            })();
            return (
              <DropdownMenuItem
                key={kind}
                data-testid={`preset-item-${kind}`}
                onClick={() => {
                  if (isGated) return;
                  onSelect(kind as SheetKind);
                }}
                aria-disabled={isGated}
                className={`flex flex-col items-start gap-1 p-3 ${isGated ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="w-full flex items-center justify-between">
                  <div className="font-medium flex items-center gap-2">
                    {preset.label}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent"
                        aria-label={`Help for ${preset.label}`}
                        aria-haspopup="dialog"
                        aria-controls={`preset-help-${kind}`}
                        title={`What is ${preset.label}?`}
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent id={`preset-help-${kind}`} className="w-72 text-xs" side="right">
                      <div className="font-medium mb-1">{preset.label}</div>
                      <p className="text-muted-foreground">{preset.description}</p>
                      {kind === 'valuation' && (
                        <div className="mt-2 text-[11px]">
                          Includes DCF. Tip: WACC is the discount rate; Terminal Value uses Gordon Growth or Exit Multiple.
                        </div>
                      )}
                      {kind === 'risk' && (
                        <div className="mt-2 text-[11px]">
                          Includes VaR/ES. VaR is potential loss at a confidence level; ES is the tail-average beyond VaR.
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-xs text-muted-foreground w-full">
                  {preset.description}
                  {(!onboardingDone && (kind === 'options' || kind === 'risk')) && (
                    <span className="ml-1 inline-block text-[10px] text-yellow-600">(advanced)</span>
                  )}
                </div>
                {isGated && (
                  <div className="text-[11px] text-muted-foreground italic">Unlock by completing: Configure a widget and Export workspace</div>
                )}
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
