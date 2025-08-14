'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trash2 } from 'lucide-react';
import { DataSourceSelector } from '@/components/editor/DataSourceSelector';
import { DataRefSchema } from '@/lib/widgets/schema';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle } from 'lucide-react';
import { getGlossaryTerm } from '@/lib/edu/glossary';

interface PropertyEditorProps {
  schema: z.ZodType<any>;
  value: any;
  onChange: (value: any) => void;
  title?: string;
  description?: string;
}

interface FormFieldProps {
  name: string;
  schema: z.ZodType<any>;
  value: any;
  onChange: (value: any) => void;
  errors?: any;
}

// Helper function to extract Zod schema information
function getSchemaInfo(schema: z.ZodType<any>): {
  type: string;
  isOptional: boolean;
  defaultValue?: any;
  description?: string;
  options?: Array<{ value: any; label: string }>;
} {
  let currentSchema = schema;
  let isOptional = false;

  // Unwrap optional schemas
  if (currentSchema instanceof z.ZodOptional) {
    isOptional = true;
    currentSchema = currentSchema._def.innerType;
  }

  // Unwrap default schemas
  let defaultValue;
  if (currentSchema instanceof z.ZodDefault) {
    defaultValue = currentSchema._def.defaultValue();
    currentSchema = currentSchema._def.innerType;
  }

  // Extract description
  const description = currentSchema.description;

  // Check if this is a DataRef schema (special case)
  if (currentSchema instanceof z.ZodObject) {
    const shape = currentSchema.shape;
    if (shape && shape.sourceId && shape.query !== undefined) {
      return { type: 'dataRef', isOptional, defaultValue, description };
    }
  }

  // Determine the type
  if (currentSchema instanceof z.ZodString) {
    return { type: 'string', isOptional, defaultValue, description };
  } else if (currentSchema instanceof z.ZodNumber) {
    return { type: 'number', isOptional, defaultValue, description };
  } else if (currentSchema instanceof z.ZodBoolean) {
    return { type: 'boolean', isOptional, defaultValue, description };
  } else if (currentSchema instanceof z.ZodEnum) {
    const options = currentSchema.options.map((option: any) => ({
      value: option,
      label: String(option).charAt(0).toUpperCase() + String(option).slice(1)
    }));
    return { type: 'select', isOptional, defaultValue, description, options };
  } else if (currentSchema instanceof z.ZodArray) {
    return { type: 'array', isOptional, defaultValue, description };
  } else if (currentSchema instanceof z.ZodObject) {
    return { type: 'object', isOptional, defaultValue, description };
  }

  return { type: 'unknown', isOptional, defaultValue, description };
}

function FormField({ name, schema, value, onChange, errors }: FormFieldProps) {
  const schemaInfo = getSchemaInfo(schema);
  const fieldId = `field-${name}`;
  const error = errors?.[name];
  const labelText = name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  // Detect glossary key heuristically from label or description
  const glossaryKey = (() => {
    const text = `${labelText} ${schemaInfo.description || ''}`.toLowerCase();
    if (/\bwacc\b/.test(text)) return 'wacc' as const;
    if (/terminal/.test(text)) return 'terminal-value' as const;
    if (/\bvar\b/.test(text)) return 'var' as const;
    if (/\bes\b|expected shortfall/.test(text)) return 'es' as const;
    if (/greeks?/.test(text)) return 'greeks' as const;
    return undefined;
  })();
  const glossary = glossaryKey ? getGlossaryTerm(glossaryKey) : undefined;
  const helpId = `${fieldId}-help`;

  const renderField = () => {
    switch (schemaInfo.type) {
      case 'string':
        if (name.toLowerCase().includes('description') || name.toLowerCase().includes('content')) {
          return (
            <Textarea
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={schemaInfo.description || `Enter ${name}`}
            />
          );
        }
        return (
          <Input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={schemaInfo.description || `Enter ${name}`}
          />
        );

      case 'number':
        return (
          <Input
            id={fieldId}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder={schemaInfo.description || `Enter ${name}`}
          />
        );

      case 'boolean':
        return (
          <Switch
            id={fieldId}
            checked={value || false}
            onCheckedChange={onChange}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger id={fieldId}>
              <SelectValue placeholder={`Select ${name}`} />
            </SelectTrigger>
            <SelectContent>
              {schemaInfo.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'array':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {Array.isArray(value) ? value.length : 0} items
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newValue = Array.isArray(value) ? [...value, ''] : [''];
                  onChange(newValue);
                }}
              >
                Add Item
              </Button>
            </div>
            {Array.isArray(value) && value.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item || ''}
                  onChange={(e) => {
                    const newValue = [...value];
                    newValue[index] = e.target.value;
                    onChange(newValue);
                  }}
                  placeholder={`Item ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newValue = value.filter((_: any, i: number) => i !== index);
                    onChange(newValue);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        );

      case 'object':
        return (
          <Card>
            <CardContent className="pt-4">
              <Textarea
                id={fieldId}
                value={JSON.stringify(value || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onChange(parsed);
                  } catch {
                    // Invalid JSON, keep the raw string for now
                  }
                }}
                placeholder="Enter JSON object"
                rows={4}
              />
            </CardContent>
          </Card>
        );

      case 'dataRef':
        return (
          <DataSourceSelector
            value={value}
            onChange={onChange}
          />
        );

      default:
        return (
          <Input
            id={fieldId}
            type="text"
            value={JSON.stringify(value || '')}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={schemaInfo.description || `Enter ${name}`}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-2">
        {labelText}
        {!schemaInfo.isOptional && <Badge variant="secondary" className="text-xs">Required</Badge>}
        {glossary && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent"
                aria-label={`Help: ${glossary.title}`}
                aria-haspopup="dialog"
                aria-controls={helpId}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent id={helpId} className="w-72 text-xs" side="right" aria-describedby={helpId}>
              <div className="font-medium mb-1">{glossary.title}</div>
              <p className="text-muted-foreground">{glossary.body}</p>
            </PopoverContent>
          </Popover>
        )}
      </Label>
      {schemaInfo.description && (
        <p className="text-xs text-muted-foreground">{schemaInfo.description}</p>
      )}
      {renderField()}
      {error && (
        <Alert variant="destructive" className="mt-1">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {error.message || 'Invalid value'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function PropertyEditor({ schema, value, onChange, title, description }: PropertyEditorProps) {
  const [errors, setErrors] = React.useState<any>({});
  const [localValue, setLocalValue] = React.useState(value || {});

  // Update local value when prop value changes
  React.useEffect(() => {
    setLocalValue(value || {});
  }, [value]);

  // Validate and apply changes
  const applyChanges = () => {
    try {
      const result = schema.parse(localValue);
      onChange(result);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err;
        });
        setErrors(fieldErrors);
      }
    }
  };

  // Auto-apply changes with debounce
  React.useEffect(() => {
    const timer = setTimeout(applyChanges, 500);
    return () => clearTimeout(timer);
  }, [localValue, applyChanges]);

  const updateField = (fieldName: string, fieldValue: any) => {
    setLocalValue((prev: any) => ({
      ...prev,
      [fieldName]: fieldValue,
    }));
  };

  // Extract field schemas from object schema
  const getObjectFields = (schema: z.ZodType<any>): Record<string, z.ZodType<any>> => {
    if (schema instanceof z.ZodObject) {
      return schema.shape;
    }
    return {};
  };

  const fields = getObjectFields(schema);

  return (
    <div className="space-y-4">
      {title && (
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      
      <Separator />
      
      <div className="space-y-4">
        {Object.entries(fields).map(([fieldName, fieldSchema]) => (
          <FormField
            key={fieldName}
            name={fieldName}
            schema={fieldSchema}
            value={localValue[fieldName]}
            onChange={(fieldValue) => updateField(fieldName, fieldValue)}
            errors={errors}
          />
        ))}
      </div>

      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the validation errors above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}