'use client';

import { GitBranch, CheckCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

export function StatusBar() {
  const { sheets } = useWorkspaceStore();

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