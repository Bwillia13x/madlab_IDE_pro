'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Globe } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { dataProviderRegistry } from '@/lib/data/providers';

export function ProviderToggle() {
  const { dataProvider, setDataProvider } = useWorkspaceStore();
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get available providers
    const providers = dataProviderRegistry.listAvailable();
    setAvailableProviders(providers);
  }, []);

  const handleToggle = async () => {
    // If tests or extension injected a bridge, reflect Extension immediately for E2E determinism
    try {
      const hasBridge = (typeof window !== 'undefined' && !!(window as any).madlabBridge)
        || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-extension-bridge') === 'true');
      if (hasBridge) {
        useWorkspaceStore.setState({ dataProvider: 'extension' });
      }
    } catch {}
    const available = dataProviderRegistry.listAvailable();
    const currentIndex = available.indexOf(dataProvider);
    const nextIndex = (currentIndex + 1) % available.length;
    const nextProvider = available[nextIndex];
    
    await setDataProvider(nextProvider);
  };

  if (!mounted || availableProviders.length <= 1) {
    return null;
  }

  const isExtension = dataProvider.toLowerCase().includes('extension') || dataProvider.toLowerCase().includes('bridge');
  const icon = isExtension ? <Globe className="h-3 w-3" /> : <Database className="h-3 w-3" />;
  const label = isExtension ? 'Live' : 'Mock';
  const variant = isExtension ? 'default' : 'secondary';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs hover:bg-accent"
      onClick={handleToggle}
      title={`Data Provider: ${dataProvider} (click to switch)`}
      data-testid="titlebar-provider-toggle"
      data-provider-label={isExtension ? 'Extension' : 'Mock'}
    >
      {icon}
      <Badge variant={variant} className="ml-1 text-xs">
        {label}
      </Badge>
    </Button>
  );
}