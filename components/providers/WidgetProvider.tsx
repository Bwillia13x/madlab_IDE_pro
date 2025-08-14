'use client';

import React from 'react';
import { registerCoreWidgets } from '@/lib/widgets/coreWidgets';

type WidgetProviderProps = { children: React.ReactNode };

export function WidgetProvider({ children }: WidgetProviderProps) {
  React.useEffect(() => {
    try {
      registerCoreWidgets();
      // eslint-disable-next-line no-console
      console.log('WidgetProvider: core widgets registered');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to register core widgets', e);
    }
  }, []);

  return <>{children}</>;
}

export default WidgetProvider;


