import type { PriceData } from '@/lib/types/financial';

export interface MarketDataResponse {
  data: PriceData[];
  metadata: {
    source: string;
    timestamp: Date;
    count: number;
  };
}


