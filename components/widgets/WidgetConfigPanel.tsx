'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X, Save, RefreshCw, Settings } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { getWidgetSchema } from '@/lib/widgets/registry';

interface WidgetConfigPanelProps {
  widget: Widget;
  sheetId: string;
  onClose: () => void;
  onSave: (widget: Widget) => void;
}

export function WidgetConfigPanel({ widget, sheetId: _sheetId, onClose, onSave }: WidgetConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(widget.props || {});
  const [isDirty, setIsDirty] = useState(false);
  
  const schema = getWidgetSchema(widget.type);
  
  const handleConfigChange = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave({
      ...widget,
      props: config,
    });
    setIsDirty(false);
  };

  const handleReset = () => {
    setConfig(widget.props || {});
    setIsDirty(false);
  };

  interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'select';
  description?: string;
  min?: number;
  max?: number;
  options?: string[];
  label: string;
  required?: boolean;
  default?: string | number | boolean;
}

  const renderField = (key: string, fieldSchema: FieldSchema) => {
    const currentValue = config[key];
    const fieldType = fieldSchema.type;
    
    switch (fieldType) {
      case 'string':
        return (
          <Input
            value={(currentValue as string) || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            placeholder={fieldSchema.description || `Enter ${key}`}
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={(currentValue as number) || ''}
            onChange={(e) => handleConfigChange(key, parseFloat(e.target.value) || 0)}
            placeholder={fieldSchema.description || `Enter ${key}`}
            min={fieldSchema.min}
            max={fieldSchema.max}
            step="any"
          />
        );
        
      case 'boolean':
        return (
          <Switch
            checked={(currentValue as boolean) || false}
            onCheckedChange={(checked) => handleConfigChange(key, checked)}
          />
        );
        
      case 'select':
        return (
          <Select
            value={(currentValue as string) || String(fieldSchema.default || '')}
            onValueChange={(val) => handleConfigChange(key, val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldSchema.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      default:
        return (
          <Input
            value={(currentValue as string) || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            placeholder={`Enter ${key}`}
          />
        );
    }
  };

  if (!schema) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-sm">Unknown Widget Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configuration not available for widget type: {widget.type}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {widget.title} Configuration
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{schema.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Basic Properties */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Widget Title</Label>
            <Input
              value={widget.title}
              onChange={(e) => onSave({ ...widget, title: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <Separator />
          
          {/* Schema-based Configuration */}
          {Object.entries(schema.props).map(([key, fieldSchema]) => (
            <div key={key} className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {fieldSchema.label}
                {fieldSchema.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderField(key, fieldSchema)}
              {fieldSchema.description && (
                <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
              )}
            </div>
          ))}
        </div>
        
        <Separator />
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            className="flex-1"
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
        
        {/* Widget Info */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Type: {widget.type}</div>
            <div>Category: {schema.category}</div>
            <div>ID: {widget.id}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}