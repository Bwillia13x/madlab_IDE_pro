export type OnboardingVariant = 'demo' | 'tour' | 'interactive';

const STORAGE_KEY = 'madlab_ab_onboarding_variant';

export function getOnboardingVariant(): OnboardingVariant {
  try {
    const sp = new URLSearchParams(window.location.search);
    const qp = sp.get('abOnboarding');
    if (qp === 'demo' || qp === 'tour' || qp === 'interactive') {
      try { localStorage.setItem(STORAGE_KEY, qp); } catch {}
      return qp;
    }
  } catch {}

  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'demo' || stored === 'tour' || stored === 'interactive') {
      return stored;
    }
  } catch {}

  // Random assignment with simple weights
  const r = Math.random();
  const assigned: OnboardingVariant = r < 0.5 ? 'demo' : r < 0.8 ? 'tour' : 'interactive';
  try { localStorage.setItem(STORAGE_KEY, assigned); } catch {}
  return assigned;
}


