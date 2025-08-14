'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

export function SuccessCelebration() {
  const { lastCelebration } = useWorkspaceStore();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (lastCelebration && lastCelebration.message) {
      setMessage(lastCelebration.message);
      setVisible(true);
      const id = setTimeout(() => setVisible(false), 1200);
      return () => clearTimeout(id);
    }
  }, [lastCelebration?.ts]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-start justify-center mt-16">
      <div className="bg-emerald-600/95 text-white shadow-xl rounded-full px-4 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}


