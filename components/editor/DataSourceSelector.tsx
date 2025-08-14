'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Database, 
  FileText, 
  Globe, 
  Plus, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';
import { dataSourceManager } from '@/lib/data/manager';
import { DataRef } from '@/lib/widgets/schema';

interface DataSourceSelectorProps {
  value?: DataRef;
  onChange: (value?: DataRef) => void;
}

interface CreateDataSourceFormProps {
  onCreated: (id: string) => void;
  onCancel: () => void;
}

const DataSourceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'static-json':
      return <Database className="h-4 w-4" />;
    case 'csv':
      return <FileText className="h-4 w-4" />;
    case 'rest':
      return <Globe className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
};

function CreateDataSourceForm({ onCreated, onCancel }: CreateDataSourceFormProps) {
  const [type, setType] = useState<'static-json' | 'csv' | 'rest'>('static-json');
  const [name, setName] = useState('');
  const [config, setConfig] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dataSourceConfig = {
        id: `${type}_${Date.now()}`,
        name: name.trim(),
        type,
        options: config,
      };

      const dataSource = await dataSourceManager.createDataSource(dataSourceConfig);
      const connected = await dataSource.connect();

      if (!connected) {
        throw new Error('Failed to connect to data source');
      }

      onCreated(dataSourceConfig.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create data source');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTypeSpecificConfig = () => {
    switch (type) {
      case 'static-json':
        return (
          <div className="space-y-4">
            <div>
              <Label>Data (JSON)</Label>
              <Textarea
                value={config.data ? JSON.stringify(config.data, null, 2) : '[]'}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateConfig('data', parsed);
                  } catch {
                    // Keep the raw string for now
                  }
                }}
                placeholder="Enter JSON data..."
                rows={6}
              />
            </div>
            <div>
              <Label>Or URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder="https://api.example.com/data.json"
              />
            </div>
            <div>
              <Label>JSON Path (optional)</Label>
              <Input
                value={config.jsonPath || ''}
                onChange={(e) => updateConfig('jsonPath', e.target.value)}
                placeholder="data.results"
              />
            </div>
          </div>
        );

      case 'csv':
        return (
          <div className="space-y-4">
            <div>
              <Label>CSV Data</Label>
              <Textarea
                value={config.data || ''}
                onChange={(e) => updateConfig('data', e.target.value)}
                placeholder="CSV content..."
                rows={6}
              />
            </div>
            <div>
              <Label>Or CSV URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder="https://example.com/data.csv"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delimiter</Label>
                <Input
                  value={config.delimiter || ','}
                  onChange={(e) => updateConfig('delimiter', e.target.value)}
                  placeholder=","
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.headers !== false}
                  onCheckedChange={(checked) => updateConfig('headers', checked)}
                />
                <Label>Has Headers</Label>
              </div>
            </div>
          </div>
        );

      case 'rest':
        return (
          <div className="space-y-4">
            <div>
              <Label>Base URL</Label>
              <Input
                value={config.baseUrl || ''}
                onChange={(e) => updateConfig('baseUrl', e.target.value)}
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <Label>Endpoint</Label>
              <Input
                value={config.endpoint || ''}
                onChange={(e) => updateConfig('endpoint', e.target.value)}
                placeholder="/data"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={config.method || 'GET'}
                onValueChange={(value) => updateConfig('method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Authentication Type</Label>
              <Select
                value={config.authType || 'none'}
                onValueChange={(value) => updateConfig('authType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="apikey">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.authType === 'bearer' && (
              <div>
                <Label>Bearer Token</Label>
                <Input
                  type="password"
                  value={config.authToken || ''}
                  onChange={(e) => updateConfig('authToken', e.target.value)}
                  placeholder="Enter token..."
                />
              </div>
            )}
            {config.authType === 'apikey' && (
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => updateConfig('apiKey', e.target.value)}
                  placeholder="Enter API key..."
                />
              </div>
            )}
            <div>
              <Label>Data Path (optional)</Label>
              <Input
                value={config.dataPath || ''}
                onChange={(e) => updateConfig('dataPath', e.target.value)}
                placeholder="data.results"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Data Source Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Data Source"
          />
        </div>
        
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={(value: any) => setType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="static-json">Static JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="rest">REST API</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {renderTypeSpecificConfig()}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
          {isLoading ? 'Creating...' : 'Create Data Source'}
        </Button>
      </div>
    </div>
  );
}

export function DataSourceSelector({ value, onChange }: DataSourceSelectorProps) {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [query, setQuery] = useState(value?.query || '');

  const refreshDataSources = () => {
    const sources = dataSourceManager.listDataSources();
    setDataSources(sources);
  };

  useEffect(() => {
    refreshDataSources();
  }, []);

  const handleDataSourceChange = (sourceId: string | undefined) => {
    if (!sourceId) {
      onChange(undefined);
      return;
    }

    onChange({
      sourceId,
      query: query || undefined,
    });
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (value?.sourceId) {
      onChange({
        sourceId: value.sourceId,
        query: newQuery || undefined,
      });
    }
  };

  const handleDataSourceCreated = (id: string) => {
    refreshDataSources();
    setIsCreateDialogOpen(false);
    onChange({
      sourceId: id,
      query: query || undefined,
    });
  };

  const testConnection = async (sourceId: string) => {
    try {
      const success = await dataSourceManager.testConnection(sourceId);
      // Could show a toast notification here
      console.log(`Connection test for ${sourceId}:`, success ? 'Success' : 'Failed');
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Data Source</Label>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Data Source</DialogTitle>
            </DialogHeader>
            <CreateDataSourceForm
              onCreated={handleDataSourceCreated}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Select
        value={value?.sourceId || ''}
        onValueChange={handleDataSourceChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a data source..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None</SelectItem>
          {dataSources.map((source) => (
            <SelectItem key={source.id} value={source.id}>
              <div className="flex items-center space-x-2">
                <DataSourceIcon type={source.type} />
                <span>{source.name}</span>
                {source.connected ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value?.sourceId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Query (optional)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnection(value.sourceId)}
            >
              <TestTube className="h-3 w-3 mr-1" />
              Test
            </Button>
          </div>
          <Textarea
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Enter query parameters (JSON format)..."
            rows={3}
          />
          {dataSources.find(s => s.id === value.sourceId) && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DataSourceIcon 
                      type={dataSources.find(s => s.id === value.sourceId)?.type || ''} 
                    />
                    <span className="text-sm font-medium">
                      {dataSources.find(s => s.id === value.sourceId)?.name}
                    </span>
                  </div>
                  <Badge variant={
                    dataSources.find(s => s.id === value.sourceId)?.connected 
                      ? 'default' 
                      : 'destructive'
                  }>
                    {dataSources.find(s => s.id === value.sourceId)?.connected 
                      ? 'Connected' 
                      : 'Disconnected'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}