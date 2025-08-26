'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Widget } from '@/lib/store';
import { orderManagementSystem, type Order } from '@/lib/trading/orderManagement';

interface PaperTradingConsoleProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (newTitle: string) => void;
}

export function PaperTradingConsole({ widget, onTitleChange }: Readonly<PaperTradingConsoleProps>) {
  const [symbol, setSymbol] = useState<string>(String((widget.props as any)?.symbol || 'AAPL'));
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState<string>('100');
  const [price, setPrice] = useState<string>('100');
  const [orders, setOrders] = useState<Order[]>([]);

  // Keep local orders list synced with OMS
  useEffect(() => {
    setOrders(orderManagementSystem.getAllOrders());

    const onAny = () => setOrders(orderManagementSystem.getAllOrders());
    orderManagementSystem.on('orderSubmitted', onAny);
    orderManagementSystem.on('orderRouted', onAny);
    orderManagementSystem.on('orderExecuted', onAny);
    orderManagementSystem.on('orderFinalized', onAny);
    orderManagementSystem.on('orderCanceled', onAny);
    orderManagementSystem.on('orderModified', onAny);
    return () => {
      orderManagementSystem.off('orderSubmitted', onAny);
      orderManagementSystem.off('orderRouted', onAny);
      orderManagementSystem.off('orderExecuted', onAny);
      orderManagementSystem.off('orderFinalized', onAny);
      orderManagementSystem.off('orderCanceled', onAny);
      orderManagementSystem.off('orderModified', onAny);
    };
  }, []);

  const canSubmit = useMemo(() => {
    const qty = Number(quantity);
    if (!symbol || !qty || qty <= 0) return false;
    if (orderType === 'limit') {
      const p = Number(price);
      if (!p || p <= 0) return false;
    }
    return true;
  }, [symbol, quantity, orderType, price]);

  const submitOrder = async () => {
    if (!canSubmit) return;
    const qty = Math.floor(Number(quantity));
    const p = Number(price);
    await orderManagementSystem.submitOrder({
      clientOrderId: `cli_${Date.now()}`,
      symbol: symbol.toUpperCase(),
      side,
      orderType,
      quantity: qty,
      price: orderType === 'limit' ? p : undefined,
      timeInForce: 'day',
      routing: {
        venue: 'smart',
        preferredVenues: ['nasdaq', 'nyse'],
        routingStrategy: 'smart',
        allowDarkPools: true,
        minimumFillSize: 1,
        maxParticipationRate: 0.1,
        priceImprovement: true,
        hiddenQuantity: 0,
      },
      execution: {
        executions: [],
        totalExecuted: 0,
        averagePrice: 0,
        totalCommissions: 0,
        totalFees: 0,
        estimatedSlippage: 0,
        actualSlippage: 0,
        marketImpact: 0,
        implementationShortfall: 0,
      },
      childOrderIds: [],
    } as any);
  };

  const cancelOrder = async (id: string) => {
    await orderManagementSystem.cancelOrder(id);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{widget.title || 'Paper Trading'}</CardTitle>
        {onTitleChange && (
          <Button size="sm" variant="ghost" onClick={() => onTitleChange('Paper Trading')}>Reset Title</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-6 gap-2 items-end">
          <div className="col-span-2">
            <label className="block text-xs mb-1">Symbol</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" />
          </div>
          <div>
            <label className="block text-xs mb-1">Side</label>
            <Select value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
              <SelectTrigger><SelectValue placeholder="Side" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs mb-1">Type</label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as 'market' | 'limit')}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs mb-1">Qty</label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1">Limit Price</label>
            <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={orderType !== 'limit'} />
          </div>
          <div className="col-span-6 flex justify-end">
            <Button onClick={submitOrder} disabled={!canSubmit}>
              Submit
            </Button>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs font-medium mb-2">Orders</div>
          {orders.length === 0 ? (
            <div className="text-xs text-muted-foreground">No orders yet.</div>
          ) : (
            <div className="max-h-60 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground text-[11px]">
                    <th className="text-left font-medium p-1">ID</th>
                    <th className="text-left font-medium p-1">Symbol</th>
                    <th className="text-left font-medium p-1">Side</th>
                    <th className="text-left font-medium p-1">Type</th>
                    <th className="text-right font-medium p-1">Qty</th>
                    <th className="text-right font-medium p-1">Exec</th>
                    <th className="text-right font-medium p-1">AvgPx</th>
                    <th className="text-left font-medium p-1">Status</th>
                    <th className="text-right font-medium p-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="p-1 truncate max-w-[120px]">{o.id}</td>
                      <td className="p-1">{o.symbol}</td>
                      <td className="p-1 capitalize">{o.side}</td>
                      <td className="p-1 capitalize">{o.orderType}</td>
                      <td className="p-1 text-right">{o.quantity}</td>
                      <td className="p-1 text-right">{o.executedQuantity}</td>
                      <td className="p-1 text-right">{o.averageExecutionPrice.toFixed(2)}</td>
                      <td className="p-1 capitalize">{o.status.replace('_', ' ')}</td>
                      <td className="p-1 text-right">
                        {['pending', 'new', 'partially_filled'].includes(o.status) && (
                          <Button size="sm" variant="secondary" onClick={() => cancelOrder(o.id)}>Cancel</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


