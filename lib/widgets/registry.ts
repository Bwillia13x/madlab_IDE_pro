import type { RegistryEntry } from './schema';

const registry = new Map<string, RegistryEntry>();

export function registerWidget(entry: RegistryEntry) {
  registry.set(entry.type, entry);
}

export function getSchemaWidget(type: string): RegistryEntry | undefined {
  return registry.get(type);
}