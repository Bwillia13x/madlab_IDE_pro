/**
 * URL persistence utility for workspace state.
 * Enables shareable deep-links with current provider, symbol, and sheet context.
 */

export interface URLState {
  provider?: string;
  symbol?: string;
  sheet?: string;
  theme?: string;
}

/**
 * Update URL with current workspace state without triggering navigation
 */
export function updateURLState(state: Partial<URLState>): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  
  // Update or remove parameters based on state
  Object.entries(state).forEach(([key, value]) => {
    if (value && value !== '') {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });
  
  // Update URL without navigation
  window.history.replaceState({}, '', url.toString());
}

/**
 * Read current URL state
 */
export function getURLState(): URLState {
  if (typeof window === 'undefined') return {};
  
  const url = new URL(window.location.href);
  return {
    provider: url.searchParams.get('provider') || undefined,
    symbol: url.searchParams.get('symbol') || undefined,
    sheet: url.searchParams.get('sheet') || undefined,
    theme: url.searchParams.get('theme') || undefined,
  };
}

/**
 * Sync URL state with workspace store
 */
export function syncURLWithStore(
  urlState: URLState,
  setProvider: (provider: string) => Promise<void>,
  setSymbol: (symbol: string) => void,
  setSheet: (id: string) => void,
  setTheme: (theme: 'light' | 'dark' | 'malibu-sunrise' | 'malibu-sunset') => void
): void {
  // Apply provider if specified and different from current
  if (urlState.provider) {
    setProvider(urlState.provider).catch(console.warn);
  }
  
  // Apply symbol if specified
  if (urlState.symbol) {
    setSymbol(urlState.symbol);
  }
  
  // Apply sheet if specified
  if (urlState.sheet) {
    setSheet(urlState.sheet);
  }
  
  // Apply theme if specified
  if (urlState.theme && ['light', 'dark', 'malibu-sunrise', 'malibu-sunset'].includes(urlState.theme)) {
    setTheme(urlState.theme as "light" | "dark" | "malibu-sunrise" | "malibu-sunset");
  }
}

/**
 * Create a shareable link for the current workspace state
 */
export function createShareableLink(state: URLState): string {
  if (typeof window === 'undefined') return '';
  
  const url = new URL(window.location.origin + window.location.pathname);
  
  Object.entries(state).forEach(([key, value]) => {
    if (value && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  
  return url.toString();
}
