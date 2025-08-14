"use client";

import { Fragment, useMemo } from 'react';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PrimitiveField = z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodEnum<[string, ...string[]]>;

export interface AutoFormProps<T extends z.ZodTypeAny = z.ZodTypeAny> {
  schema: T;
  value: unknown;
  onChange: (next: any) => void;
  disabledKeys?: string[];
}

function getShape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> | null {
  try {
    if (schema instanceof z.ZodObject) {
      return (schema as z.ZodObject<any>).shape;
    }
    // Fallback for variations where shape is stored in _def
    const def: any = (schema as any)?._def;
    const maybeShape = typeof def?.shape === 'function' ? def.shape() : def?.shape;
    if (maybeShape && typeof maybeShape === 'object') {
      return maybeShape as Record<string, z.ZodTypeAny>;
    }
  } catch {
    // ignore
  }
  return null;
}

function coerceToType(target: z.ZodTypeAny, raw: string | boolean): any {
  if (target instanceof z.ZodNumber) {
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  if (target instanceof z.ZodBoolean) {
    return Boolean(raw);
  }
  if (target instanceof z.ZodEnum) {
    return String(raw);
  }
  // default string
  return String(raw);
}

function getNumberConstraints(field: z.ZodNumber): { min?: number; max?: number; int?: boolean; step?: number | 'any' } {
  const def: any = (field as any)._def;
  const checks: Array<{ kind: string; value?: number }> = def?.checks || [];
  const min = checks.find((c) => c.kind === 'min')?.value;
  const max = checks.find((c) => c.kind === 'max')?.value;
  const int = checks.some((c) => c.kind === 'int');
  const step: number | 'any' = int ? 1 : 'any';
  return { min, max, int, step };
}

function isZodObject(schema: z.ZodTypeAny): schema is z.ZodObject<any> {
  return schema instanceof z.ZodObject;
}

function isZodArray(schema: z.ZodTypeAny): schema is z.ZodArray<any> {
  return schema instanceof z.ZodArray;
}

export function AutoForm({ schema, value, onChange, disabledKeys = [] }: AutoFormProps) {
  const shape = useMemo(() => getShape(schema), [schema]);

  if (!shape) {
    return null;
  }

  const current = (value && typeof value === 'object') ? (value as any) : {};

  const renderField = (key: string, field: z.ZodTypeAny, fieldValue: any, onChangeField: (next: any) => void) => {
    const label = key;
    const id = `auto-${key}`;

    // Enum
    if (field instanceof z.ZodEnum) {
      const options = (field as z.ZodEnum<[string, ...string[]]>).options;
      return (
        <div key={key} className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          <Select
            value={String(fieldValue ?? options[0])}
            onValueChange={(v) => onChangeField(coerceToType(field, v))}
          >
            <SelectTrigger id={id} className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Boolean
    if (field instanceof z.ZodBoolean) {
      return (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={id}>{label}</Label>
          <Switch
            id={id}
            checked={Boolean(fieldValue)}
            onCheckedChange={(checked) => onChangeField(checked)}
          />
        </div>
      );
    }

    // Number
    if (field instanceof z.ZodNumber) {
      const constraints = getNumberConstraints(field);
      return (
        <div key={key} className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            type="number"
            className="h-8"
            value={fieldValue ?? ''}
            min={constraints.min as number | undefined}
            max={constraints.max as number | undefined}
            step={constraints.step as any}
            onChange={(e) => onChangeField(coerceToType(field, e.target.value))}
          />
          {(constraints.min !== undefined || constraints.max !== undefined) && (
            <div className="text-[10px] text-muted-foreground">
              {constraints.min !== undefined ? `min ${constraints.min}` : ''}
              {constraints.min !== undefined && constraints.max !== undefined ? ' • ' : ''}
              {constraints.max !== undefined ? `max ${constraints.max}` : ''}
            </div>
          )}
        </div>
      );
    }

    // String (default)
    if (field instanceof z.ZodString) {
      return (
        <div key={key} className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            type="text"
            className="h-8"
            value={fieldValue ?? ''}
            onChange={(e) => onChangeField(coerceToType(field, e.target.value))}
          />
        </div>
      );
    }

    // Array of primitives or objects
    if (isZodArray(field)) {
      const elem = (field as z.ZodArray<any>).element;
      const arrVal: any[] = Array.isArray(fieldValue) ? fieldValue : [];
      return (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          <div className="space-y-2 border rounded p-2">
            {arrVal.map((val, idx) => (
              <div key={idx} className="space-y-1">
                {renderField(`${key}-${idx}`, elem, val, (next) => {
                  const copy = [...arrVal];
                  copy[idx] = next;
                  onChangeField(copy);
                })}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const copy = arrVal.filter((_, i) => i !== idx);
                      onChangeField(copy);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onChangeField([...arrVal, elem instanceof z.ZodNumber ? 0 : elem instanceof z.ZodBoolean ? false : '' ])}
              >
                Add item
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Nested object: recurse
    if (isZodObject(field)) {
      return (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          <div className="pl-2 border-l">
            <AutoForm
              schema={field}
              value={fieldValue ?? {}}
              onChange={(next) => onChangeField(next)}
            />
          </div>
        </div>
      );
    }

    // Unsupported types: skip
    return null;
  };

  return (
    <div className="space-y-3">
      {Object.entries(shape).map(([key, field]) => {
        if (disabledKeys.includes(key)) return null;
        const fieldValue = current[key] as any;
        return renderField(key, field, fieldValue, (next) => onChange({ ...current, [key]: next }));
      })}
    </div>
  );
}

export default AutoForm;


