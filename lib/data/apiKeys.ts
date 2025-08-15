/**
 * Lightweight API key storage for the browser.
 * Uses localStorage with minimal obfuscation. Not truly secure,
 * but adequate for non-sensitive demo keys like Alpha Vantage.
 */

const KEY_PREFIX = 'madlab.apikey.';

function encode(value: string): string {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return value;
  }
}

function decode(value: string): string {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return value;
  }
}

export function getStoredKey(name: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + name);
    return raw ? decode(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredKey(name: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!value) {
      window.localStorage.removeItem(KEY_PREFIX + name);
      return;
    }
    window.localStorage.setItem(KEY_PREFIX + name, encode(value));
  } catch {
    // ignore
  }
}

// Convenience helpers for Alpha Vantage
export function getAlphaVantageKey(): string | null {
  return getStoredKey('alphaVantage');
}

export function setAlphaVantageKey(value: string | null): void {
  setStoredKey('alphaVantage', value);
}
