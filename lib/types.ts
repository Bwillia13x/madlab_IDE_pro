import type { Layout } from 'react-grid-layout';

export interface Widget {
  id: string;
  type: string;
  title: string;
  layout: Layout;
  props?: Record<string, unknown>;
  version?: number;
}


