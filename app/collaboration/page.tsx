"use client";

import { useEffect } from 'react';
import CollaborationDashboard from '@/components/collaboration/CollaborationDashboard';
import { workspaceSync } from '@/lib/collaboration/workspaceSync';

const FEATURE_COLLAB = String(process.env.NEXT_PUBLIC_FEATURE_COLLAB || '').toLowerCase() === 'true';
const WS_URL = String(process.env.NEXT_PUBLIC_SYNC_WS_URL || '');

export default function CollaborationPage() {
  useEffect(() => {
    if (FEATURE_COLLAB && WS_URL) {
      try {
        const userId = 'guest';
        const workspaceId = 'default';
        workspaceSync.connect(workspaceId, userId);
      } catch {}
    }
    return () => {
      try { workspaceSync.disconnect(); } catch {}
    };
  }, []);

  return (
    <div className="p-4">
      <CollaborationDashboard />
    </div>
  );
}

