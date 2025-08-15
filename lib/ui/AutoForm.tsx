import React from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface AutoFormProps {
  schema: z.ZodObject<any>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

export default function AutoForm({ schema, value, onChange }: AutoFormProps) {
  const shape = schema.shape;
  const fields = Object.entries(shape) as [string, z.ZodTypeAny][];

  const handleFieldChange = (fieldName: string, fieldValue: unknown) => {
    onChange({
      ...value,
      [fieldName]: fieldValue,
    });
  };

  const renderField = (fieldName: string, fieldSchema: z.ZodTypeAny) => {
    const currentValue = value[fieldName];
    
    if (fieldSchema instanceof z.ZodString) {
      return (
        <Input
          value={(currentValue as string) || ''}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          placeholder={`Enter ${fieldName}`}
        />
      );
    }
    
    if (fieldSchema instanceof z.ZodNumber) {
      return (
        <Input
          type="number"
          value={(currentValue as number) || ''}
          onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value) || 0)}
          placeholder={`Enter ${fieldName}`}
        />
      );
    }
    
    if (fieldSchema instanceof z.ZodBoolean) {
      return (
        <Switch
          checked={(currentValue as boolean) || false}
          onCheckedChange={(checked) => handleFieldChange(fieldName, checked)}
        />
      );
    }
    
    if (fieldSchema instanceof z.ZodEnum) {
      const options = fieldSchema._def.values;
      return (
        <Select
          value={(currentValue as string) || options[0]}
          onValueChange={(val) => handleFieldChange(fieldName, val)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // Default to string input for unknown types
    return (
      <Input
        value={(currentValue as string) || ''}
        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        placeholder={`Enter ${fieldName}`}
      />
    );
  };

  return (
    <div className="space-y-3">
      {fields.map(([fieldName, fieldSchema]) => (
        <div key={fieldName} className="space-y-2">
          <Label className="text-xs text-muted-foreground capitalize">
            {fieldName.replace(/([A-Z])/g, ' $1').trim()}
          </Label>
          {renderField(fieldName, fieldSchema)}
        </div>
      ))}
    </div>
  );
}