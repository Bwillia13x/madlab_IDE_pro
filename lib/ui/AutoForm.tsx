import React from 'react';

type AutoFormProps = {
  schema: unknown;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

export default function AutoForm({ value, onChange }: AutoFormProps) {
  const symbol = typeof value?.symbol === 'string' ? (value.symbol as string) : '';

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">Symbol</label>
      <input
        value={symbol}
        onChange={(e) => {
          const v = (e.target.value || '').toUpperCase().slice(0, 12);
          onChange({ ...value, symbol: v });
        }}
        placeholder="AAPL"
        className="h-8 px-2 py-1 text-sm w-full bg-input border-border text-foreground border rounded"
      />
    </div>
  );
}