'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowLeft, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { SHEET_PRESETS, type SheetKind } from '@/lib/presets';
import { toast } from 'sonner';
import { getOnboardingVariant } from '@/lib/analytics/experiments';
import analytics from '@/lib/analytics';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for element to highlight
  action?: () => void; // Optional action to perform
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showSkip?: boolean;
}

// Full tour (legacy)
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MAD LAB Workbench',
    description: 'Your professional financial analysis platform. Let\'s take a quick tour to get you started.',
    target: '[data-testid="workspace"]',
    position: 'center',
    showSkip: true
  },
  {
    id: 'create-sheet',
    title: 'Create Your First Sheet',
    description: 'Click the + button to create a new analysis sheet from preset templates.',
    target: '[data-testid="add-sheet"]',
    position: 'bottom',
    action: () => {
      // Highlight the add sheet button
      document.querySelector('[data-testid="add-sheet"]')?.classList.add('ring-2', 'ring-primary');
    }
  },
  {
    id: 'activity-bar',
    title: 'Activity Bar',
    description: 'Access Explorer panel, Extensions, and other tools from this sidebar.',
    target: '[data-testid="activity-bar"]',
    position: 'right'
  },
  {
    id: 'explorer',
    title: 'Explorer Panel',
    description: 'Browse your data sources, models, and files here. Click to toggle visibility.',
    target: '[data-testid="activity-explorer"]',
    position: 'right',
    action: () => {
      const { explorerCollapsed, toggleExplorer } = useWorkspaceStore.getState();
      if (explorerCollapsed) {
        toggleExplorer();
      }
    }
  },
  {
    id: 'status-bar',
    title: 'Status Bar',
    description: 'Monitor your data provider status, sheet info, and system status here.',
    target: '[data-testid="status-bar"]',
    position: 'top'
  },
  {
    id: 'provider-toggle',
    title: 'Data Provider',
    description: 'Switch between Mock data (for demos) and Extension data (for live trading).',
    target: '[data-testid="provider-toggle"]',
    position: 'top'
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Use Alt+1 (Explorer), Alt+3 (Chat), Cmd+D (Duplicate), Delete (Remove), and Esc (Deselect).',
    target: '[data-testid="workspace"]',
    position: 'center'
  }
];

// Value-first, 30s demo focused variant
const DEMO_STEPS: OnboardingStep[] = [
  {
    id: 'demo-ready',
    title: 'A complete Valuation demo is ready',
    description: 'We preloaded a finished analysis so you see value immediately. Try editing a symbol or opening Configure on any widget.',
    target: '[data-testid="workspace"]',
    position: 'center',
    showSkip: true,
  },
  {
    id: 'next-actions',
    title: 'Next steps',
    description: 'Add another sheet from Presets, or press ⌘K to discover commands. You can revisit the full tour anytime from the Command Palette.',
    target: '[data-testid="workspace"]',
    position: 'center',
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ isOpen, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [variant, setVariant] = useState<'demo' | 'tour' | 'interactive'>('demo');
  const [interactiveStepId, setInteractiveStepId] = useState<'create_sheet' | 'configure_widget' | 'export' | 'done'>('create_sheet');
  const completedInteractiveStepsRef = useRef<{ create_sheet?: boolean; configure_widget?: boolean; export?: boolean }>({});

  useEffect(() => {
    if (isOpen) {
      // Auto-complete onboarding in automation to avoid overlay blocking UI
      if (typeof navigator !== 'undefined' && (navigator as any).webdriver) {
        onComplete();
        return;
      }
      // Determine A/B variant (URL param > localStorage > default 'demo')
      try { setVariant(getOnboardingVariant()); } catch {}

      // Value-first: preload a complete valuation sheet if none exists
      try {
        if (variant !== 'tour') {
          const store = useWorkspaceStore.getState();
          if (!Array.isArray(store.sheets) || store.sheets.length === 0) {
            const label = SHEET_PRESETS['valuation']?.label || 'Valuation Workbench';
            store.addSheet('valuation' as SheetKind, label);
            const sheetId = store.activeSheetId;
            if (sheetId) {
              store.populateSheetWithPreset(sheetId, 'valuation' as SheetKind);
            }
            try { toast.success('Demo loaded — explore the valuation workbench'); } catch {}
          }
        }
      } catch {}

      setIsVisible(true);
      setCurrentStep(0);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const steps = variant === 'tour' ? ONBOARDING_STEPS : DEMO_STEPS;
  const step = steps[currentStep];

  // Interactive variant: derive current step from learningProgress and watch store for completion
  useEffect(() => {
    if (!isVisible) return;
    const activeVariant = (() => {
      try { return getOnboardingVariant(); } catch { return variant; }
    })();
    if (activeVariant !== 'interactive') return;

    let prevLp = { ...useWorkspaceStore.getState().learningProgress };
    const updateFromState = () => {
      try {
        const s = useWorkspaceStore.getState();
        const lp = s.learningProgress || {} as any;
        // Determine current step
        if (!lp.createdFirstSheet) {
          setInteractiveStepId('create_sheet');
        } else if (!lp.configuredWidget) {
          setInteractiveStepId('configure_widget');
          // Remove highlight from add-sheet
          document.querySelector('[data-testid="add-sheet"]')?.classList.remove('ring-2','ring-primary');
        } else if (!lp.exportedWorkspace) {
          setInteractiveStepId('export');
        } else {
          setInteractiveStepId('done');
        }

        // Detect transitions to mark step complete, toast and analytics
        if (lp.createdFirstSheet && !completedInteractiveStepsRef.current.create_sheet) {
          completedInteractiveStepsRef.current.create_sheet = true;
          try { analytics.track('tutorial_step', { step: 'create_sheet', variant: getOnboardingVariant() }, 'user_flow'); } catch {}
          try { s.celebrate?.('Sheet created'); } catch {}
        }
        if (lp.configuredWidget && !completedInteractiveStepsRef.current.configure_widget) {
          completedInteractiveStepsRef.current.configure_widget = true;
          try { analytics.track('tutorial_step', { step: 'configure_widget', variant: getOnboardingVariant() }, 'user_flow'); } catch {}
          try { s.celebrate?.('Widget configured'); } catch {}
        }
        if (lp.exportedWorkspace && !completedInteractiveStepsRef.current.export) {
          completedInteractiveStepsRef.current.export = true;
          try { analytics.track('tutorial_step', { step: 'export', variant: getOnboardingVariant() }, 'user_flow'); } catch {}
          try { s.celebrate?.('Workspace exported'); } catch {}
          // Completed all steps
          try { analytics.track('tutorial_completed', { variant: getOnboardingVariant() }, 'user_flow'); } catch {}
          try { s.celebrate?.('Tutorial completed'); } catch {}
          handleComplete();
        }

        prevLp = { ...lp };
      } catch {}
    };

    // Initial update
    updateFromState();
    // Periodic check to avoid depending on subscribeWithSelector
    const id = window.setInterval(updateFromState, 250);
    return () => { try { window.clearInterval(id); } catch {} };
  }, [isVisible, variant]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    onComplete();
    try {
      if (variant !== 'tour') {
        toast.success('You’re all set — happy analyzing!');
      }
    } catch {}
    
    // Clean up any highlighting
    document.querySelectorAll('.ring-2, .ring-primary').forEach(el => {
      el.classList.remove('ring-2', 'ring-primary');
    });
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    onSkip();
  }, [onSkip]);

  const getStepPosition = useCallback(() => {
    if (!step || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const cardWidth = 320;
    const cardHeight = 200;

    switch (step.position) {
      case 'top':
        return {
          top: rect.top - cardHeight - 20,
          left: Math.max(20, Math.min(window.innerWidth - cardWidth - 20, rect.left + rect.width / 2 - cardWidth / 2))
        };
      case 'bottom':
        return {
          top: rect.bottom + 20,
          left: Math.max(20, Math.min(window.innerWidth - cardWidth - 20, rect.left + rect.width / 2 - cardWidth / 2))
        };
      case 'left':
        return {
          top: Math.max(20, Math.min(window.innerHeight - cardHeight - 20, rect.top + rect.height / 2 - cardHeight / 2)),
          left: rect.left - cardWidth - 20
        };
      case 'right':
        return {
          top: Math.max(20, Math.min(window.innerHeight - cardHeight - 20, rect.top + rect.height / 2 - cardHeight / 2)),
          left: rect.right + 20
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  }, [step]);

  useEffect(() => {
    if (step?.action) {
      step.action();
    }
  }, [step]);

  if (!isVisible) return null;

  const activeVariant = (() => {
    try { return getOnboardingVariant(); } catch { return variant; }
  })();

  // Interactive guided stepper UI
  if (activeVariant === 'interactive') {
    // Highlight logical target per step
    const targetSelector = interactiveStepId === 'create_sheet'
      ? '[data-testid="add-sheet"]'
      : interactiveStepId === 'configure_widget'
        ? '[data-testid="widget-configure"]'
        : '[data-testid="workspace"]';
    const title = interactiveStepId === 'create_sheet'
      ? 'Step 1: Create a sheet'
      : interactiveStepId === 'configure_widget'
        ? 'Step 2: Configure a widget'
        : interactiveStepId === 'export'
          ? 'Step 3: Export your workspace'
          : 'All done!';
    const description = interactiveStepId === 'create_sheet'
      ? 'Click the + button to add a sheet from Presets.'
      : interactiveStepId === 'configure_widget'
        ? 'Open Configure on any widget and change a setting.'
        : interactiveStepId === 'export'
          ? 'Export via the command palette (Cmd/Ctrl+K → “Export workspace”).'
          : 'You completed the interactive tutorial.';

    // Apply highlight ring to target
    try {
      document.querySelectorAll('.ring-2.ring-primary').forEach(el => el.classList.remove('ring-2','ring-primary'));
      if (targetSelector && targetSelector !== '[data-testid="workspace"]') {
        document.querySelector(targetSelector)?.classList.add('ring-2','ring-primary');
      }
    } catch {}

    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-50" />
        <Card className="fixed z-50 w-80 p-4 bg-background border shadow-lg right-4 bottom-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
              <div className="flex items-center gap-1 mt-2">
                {(['create_sheet','configure_widget','export'] as const).map((k, idx) => (
                  <div
                    key={k}
                    className={`w-1.5 h-1.5 rounded-full ${
                      (k === 'create_sheet' && (completedInteractiveStepsRef.current.create_sheet || interactiveStepId !== 'create_sheet'))
                      || (k === 'configure_widget' && (completedInteractiveStepsRef.current.configure_widget || interactiveStepId === 'export' || interactiveStepId === 'done'))
                      || (k === 'export' && (completedInteractiveStepsRef.current.export || interactiveStepId === 'done'))
                      ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleSkip} aria-label="Dismiss tutorial">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </>
    );
  }

  // Default (demo/tour) UI
  const position = getStepPosition();
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" />
      <Card
        className="fixed z-50 w-80 p-6 bg-background border shadow-lg"
        style={position}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <div className="flex gap-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-1.5 h-1.5 rounded-full ${index <= currentStep ? 'bg-primary' : 'bg-muted'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {step.showSkip && (
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Skip Tour
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete
                  </>
                ) : (
                  <>
                    {variant === 'tour' ? 'Next' : 'Continue'}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      {step.target !== '[data-testid="workspace"]' && (
        <style jsx global>{`
          ${step.target} {
            position: relative;
            z-index: 51;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
            border-radius: 4px;
          }
        `}</style>
      )}
    </>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('madlab_onboarding_completed') === 'true';
    }
    return false;
  });

  const [showOnboarding, setShowOnboarding] = useState(false);

  // In automation, permanently disable onboarding to avoid overlay interference
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).webdriver) {
      try {
        localStorage.setItem('madlab_onboarding_completed', 'true');
      } catch {}
      setHasCompletedOnboarding(true);
      setShowOnboarding(false);
    }
  }, []);

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      // Show onboarding after a short delay to let the app load
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding]);

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
    localStorage.setItem('madlab_onboarding_completed', 'true');
  }, []);

  const skipOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
    localStorage.setItem('madlab_onboarding_completed', 'true');
    localStorage.setItem('madlab_onboarding_skipped', 'true');
  }, []);

  const restartOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    setShowOnboarding(true);
    localStorage.removeItem('madlab_onboarding_completed');
    localStorage.removeItem('madlab_onboarding_skipped');
  }, []);

  return {
    showOnboarding,
    hasCompletedOnboarding,
    completeOnboarding,
    skipOnboarding,
    restartOnboarding
  };
}