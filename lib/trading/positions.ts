import { orderManagementSystem, type Execution, type Order } from './orderManagement';
import { create } from 'zustand';
import { useWorkspaceStore } from '../store';

/**
 * Lightweight positions ledger for paper trading.
 * Subscribes to OMS events and maintains cash, positions, and PnL.
 */

export type Side = 'long' | 'short';

export interface PositionLot {
  quantity: number;
  price: number;
}

export interface PaperPosition {
  symbol: string;
  side: Side;
  quantity: number;
  averagePrice: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lots: PositionLot[];
}

export interface LedgerState {
  cash: number;
  positions: Record<string, PaperPosition>;
  lastUpdated: number;
}

type LedgerActions = {
  applyExecution: (order: Order, exec: Execution) => void;
  markSymbol: (symbol: string, price: number) => void;
  hydrateFromStore: () => void;
};

type LedgerStore = LedgerState & LedgerActions;

export const usePositionsLedger = create<LedgerStore>((set, get) => ({
  cash: 100000,
  positions: {},
  lastUpdated: Date.now(),

  hydrateFromStore: () => {
    try {
      const { paperTrading } = useWorkspaceStore.getState();
      set({ cash: paperTrading.cash, positions: paperTrading.positions, lastUpdated: Date.now() });
    } catch {
      // ignore hydration errors
    }
  },

  applyExecution: (order, exec) => {
    const state = get();
    const symbol = order.symbol.toUpperCase();
    const quantity = order.side === 'buy' ? exec.quantity : -exec.quantity;
    const cost = exec.price * exec.quantity + exec.commission + exec.fees;

    // Update cash
    const nextCash = state.cash + (order.side === 'sell' ? cost : -cost);

    const existing = state.positions[symbol];
    let next: PaperPosition;

    if (!existing) {
      next = {
        symbol,
        side: quantity >= 0 ? 'long' : 'short',
        quantity,
        averagePrice: exec.price,
        marketPrice: exec.price,
        marketValue: quantity * exec.price,
        unrealizedPnL: 0,
        realizedPnL: 0,
        lots: [{ quantity, price: exec.price }],
      };
    } else {
      // Adjust lots (FIFO)
      let remaining = quantity;
      let realizedPnL = existing.realizedPnL;
      const lots = [...existing.lots];
      if (Math.sign(existing.quantity) === Math.sign(quantity) || existing.quantity === 0) {
        // Same direction or opening from flat → add a lot
        lots.push({ quantity, price: exec.price });
      } else {
        // Closing opposite direction
        while (remaining !== 0 && lots.length > 0) {
          const lot = lots[0];
          const lotQty = Math.min(Math.abs(lot.quantity), Math.abs(remaining)) * Math.sign(lot.quantity);
          const closeQty = Math.abs(lotQty);
          const pnlPerShare = (exec.price - lot.price) * Math.sign(existing.quantity); // positive for profitable close
          realizedPnL += pnlPerShare * closeQty;

          // Reduce lot
          lot.quantity -= closeQty * Math.sign(lot.quantity);
          remaining += closeQty * Math.sign(existing.quantity); // move toward zero
          if (Math.abs(lot.quantity) === 0) lots.shift();
        }
        // If overshoot flips the position, the remainder becomes a new lot
        if (remaining !== 0) {
          lots.unshift({ quantity: remaining, price: exec.price });
        }
      }

      const newQuantity = existing.quantity + quantity;
      const avgPrice = computeAveragePrice(lots);
      const marketPrice = exec.price; // mark to last execution for now; external marks can update later
      const marketValue = newQuantity * marketPrice;
      const unrealizedPnL = (marketPrice - avgPrice) * Math.abs(newQuantity) * Math.sign(newQuantity);

      next = {
        ...existing,
        side: newQuantity >= 0 ? 'long' : 'short',
        quantity: newQuantity,
        averagePrice: avgPrice,
        marketPrice,
        marketValue,
        unrealizedPnL,
        realizedPnL,
        lots,
      };
      // Drop if flat
      if (next.quantity === 0) {
        next.averagePrice = 0;
        next.marketValue = 0;
        next.unrealizedPnL = 0;
        next.lots = [];
      }
    }

    const updatedPositions = { ...state.positions } as Record<string, PaperPosition>;
    if (next.quantity === 0) delete updatedPositions[symbol];
    else updatedPositions[symbol] = next;

    set({ cash: nextCash, positions: updatedPositions, lastUpdated: Date.now() });

    // Persist minimal state into main store
    try {
      useWorkspaceStore.getState().setPaperTradingState({ cash: nextCash, positions: updatedPositions });
    } catch {
      // ignore
    }
  },

  markSymbol: (symbol, price) => {
    const { positions } = get();
    const pos = positions[symbol];
    if (!pos) return;
    const marketValue = pos.quantity * price;
    const unrealizedPnL = (price - pos.averagePrice) * Math.abs(pos.quantity) * Math.sign(pos.quantity);
    const next: PaperPosition = { ...pos, marketPrice: price, marketValue, unrealizedPnL };
    const updated = { ...positions, [symbol]: next };
    set({ positions: updated, lastUpdated: Date.now() });
    try {
      useWorkspaceStore.getState().setPaperTradingState({ cash: get().cash, positions: updated });
    } catch {}
  },
}));

function computeAveragePrice(lots: PositionLot[]): number {
  const totalQty = lots.reduce((s, l) => s + l.quantity, 0);
  if (totalQty === 0) return 0;
  const cost = lots.reduce((s, l) => s + l.quantity * l.price, 0);
  return cost / totalQty;
}

// Wire up OMS events
orderManagementSystem.on('orderExecuted', ({ order, execution }: { order: Order; execution: Execution }) => {
  usePositionsLedger.getState().applyExecution(order, execution);
});

// Optional: listen to external market marks via custom events if available later
// export function onMark(symbol: string, price: number) {
//   usePositionsLedger.getState().markSymbol(symbol, price);
// }

// Intentionally not re-exporting PaperPosition to avoid duplicate export conflicts

