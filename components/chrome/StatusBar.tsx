'use client';

import {
  GitBranch,
  CheckCircle,
  Database,
  AlertTriangle,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { getProvider } from '@/lib/data/providers';
import { useCollaboration } from '@/components/collaboration/CollaborationProvider';

export function StatusBar() {
  const { sheets, dataProvider, globalSymbol, globalTimeframe } = useWorkspaceStore();
  const { users, isConnected } = useCollaboration();
  const [providerOk, setProviderOk] = useState<'ok' | 'warn' | 'error'>('ok');
  const [providerTip, setProviderTip] = useState('');

  const onlineUsers = Array.from(users.values()).filter((user) => user.isOnline);

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
    return () => {
      cancelled = true;
    };
  }, [dataProvider]);

  return (
    <div className="h-6 bg-[#007acc] border-t border-[#2d2d30] flex items-center justify-between px-2 text-xs text-white">
      {/* Left side */}
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex items-center gap-1 flex-shrink-0">
          <GitBranch className="h-3 w-3" />
          <span>main</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <CheckCircle className="h-3 w-3" />
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" title={providerTip}>
          {providerOk === 'ok' ? (
            <Database className="h-3 w-3" />
          ) : providerOk === 'warn' ? (
            <Database className="h-3 w-3 text-yellow-200" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-red-200" />
          )}
          <span className="truncate">{dataProvider}</span>
        </div>

        {/* Collaboration Status */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          title={isConnected ? 'Collaboration active' : 'Collaboration offline'}
        >
          {isConnected ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3 text-gray-300" />
          )}
          <span>Collab</span>
        </div>

        {onlineUsers.length > 0 && (
          <div
            className="flex items-center gap-1 flex-shrink-0"
            title={`${onlineUsers.length} user${onlineUsers.length !== 1 ? 's' : ''} online`}
          >
            <Users className="h-3 w-3" />
            <span>{onlineUsers.length}</span>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="opacity-80 truncate">{globalSymbol}</span>
          <span className="opacity-80">•</span>
          <span className="opacity-80 truncate">{globalTimeframe}</span>
        </div>

        {sheets.length > 0 && (
          <span className="flex-shrink-0">
            {sheets.length} sheet{sheets.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span>UTF-8</span>
        <span>LF</span>
        <span>TypeScript</span>
        <span>Ln 1, Col 1</span>
      </div>
    </div>
  );
}
