export type PriceRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'MAX';

export interface ProviderRegistry {
  current: string;
}

const registry: ProviderRegistry = {
  current: 'mock',
};

export function setDataProvider(name: string): boolean {
  registry.current = name;
  return true;
}

export function getDataProvider(): string {
  return registry.current;
}