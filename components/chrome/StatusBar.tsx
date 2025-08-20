'use client';

import { GitBranch, CheckCircle, Database, AlertTriangle } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { getProvider } from '@/lib/data/providers';

export function StatusBar() {
  const { sheets, dataProvider, globalSymbol, globalTimeframe } = useWorkspaceStore();
  const [providerOk, setProviderOk] = useState<'ok' | 'warn' | 'error'>('ok');
  const [providerTip, setProviderTip] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const p = getProvider(dataProvider);
        const [avail, auth] = await Promise.all([p.isAvailable(), p.isAuthenticated()]);
        if (cancelled) return;
        if (avail && auth) {
          setProviderOk('ok');
          setProviderTip('Provider ready');
        } else if (avail && !auth) {
          setProviderOk('warn');
          setProviderTip('Provider available, authentication required');
        } else {
          setProviderOk('error');
          setProviderTip('Provider unavailable');
        }
      } catch {
        if (!cancelled) {
          setProviderOk('error');
          setProviderTip('Provider error');
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [dataProvider]);

  return (
    <div className="h-6 bg-[#007acc] border-t border-[#2d2d30] flex items-center justify-between px-2 text-xs text-white">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          <span>main</span>
        </div>
        
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-1" title={providerTip}>
          {providerOk === 'ok' ? (
            <Database className="h-3 w-3" />
          ) : providerOk === 'warn' ? (
            <Database className="h-3 w-3 text-yellow-200" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-red-200" />
          )}
          <span>{dataProvider}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="opacity-80">{globalSymbol}</span>
          <span className="opacity-80">•</span>
          <span className="opacity-80">{globalTimeframe}</span>
        </div>
        
        {sheets.length > 0 && (
          <span>{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span>UTF-8</span>
        <span>LF</span>
        <span>TypeScript</span>
        <span>Ln 1, Col 1</span>
      </div>
    </div>
  );
}
