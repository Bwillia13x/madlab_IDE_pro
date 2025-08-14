// Foundational financial types for safer calculations and API contracts

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
  volume: number;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}


