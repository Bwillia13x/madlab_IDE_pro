import * as vscode from 'vscode';

export type CacheEntry<T> = { data: T; ts: number; ttl: number };

const memoryCache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const e = memoryCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts < e.ttl) return e.data as T;
  memoryCache.delete(key);
  return null;
}

export function setCached<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
  memoryCache.set(key, { data, ts: Date.now(), ttl });
}

export async function getSecret(context: vscode.ExtensionContext, key: string) {
  try {
    return await context.secrets.get(key);
  } catch {
    return undefined;
  }
}


