'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEffect } from 'react';

type ConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
};

export function ConsentBanner({ onAccept, onDecline }: ConsentBannerProps) {
  // Respect Do Not Track: if DNT is on, auto-decline
  useEffect(() => {
    const dnt = typeof navigator !== 'undefined' && (navigator as any).doNotTrack === '1';
    if (dnt) onDecline();
  }, [onDecline]);
  return (
    <div className="fixed inset-x-0 bottom-12 z-50 p-3 pointer-events-none">
      <Card className="pointer-events-auto mx-auto max-w-3xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-lg border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75" role="dialog" aria-live="polite" aria-label="Analytics consent">
        <div className="text-sm text-muted-foreground">
          We use privacy-friendly analytics to improve the product. No personal data is sold, and you can change this later in settings.
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDecline} aria-label="Decline analytics">Decline</Button>
          <Button size="sm" onClick={onAccept} aria-label="Accept analytics">Accept</Button>
        </div>
      </Card>
    </div>
  );
}

export default ConsentBanner;


