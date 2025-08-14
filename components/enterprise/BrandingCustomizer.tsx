'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Upload, 
  Type, 
  Code, 
  Eye, 
  Save, 
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Image,
  Globe,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, type BrandingConfig } from '@/lib/auth';
import { analytics } from '@/lib/analytics';

interface ColorPresets {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

const COLOR_PRESETS: ColorPresets[] = [
  {
    name: 'Corporate Blue',
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
  },
  {
    name: 'Finance Green',
    primary: '#16a34a',
    secondary: '#6b7280',
    accent: '#dc2626',
  },
  {
    name: 'Investment Gold',
    primary: '#d97706',
    secondary: '#374151',
    accent: '#3b82f6',
  },
  {
    name: 'Tech Purple',
    primary: '#7c3aed',
    secondary: '#6b7280',
    accent: '#06b6d4',
  },
];

const FONT_OPTIONS = [
  { name: 'System Default', value: 'system-ui, sans-serif' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: 'Open Sans, sans-serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
];

export function BrandingCustomizer() {
  const { organization, updateBranding, hasPermission } = useAuth();
  const [branding, setBranding] = useState<BrandingConfig>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (organization?.branding) {
      setBranding(organization.branding);
    }
  }, [organization]);

  const canCustomize = hasPermission('org_settings');

  const handleInputChange = (field: keyof BrandingConfig, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleColorPreset = (preset: ColorPresets) => {
    setBranding(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!canCustomize) {
      toast.error('You do not have permission to modify branding');
      return;
    }

    setIsLoading(true);
    
    try {
      await updateBranding(branding);
      setHasChanges(false);
      toast.success('Branding updated successfully');
      
      analytics.track('branding_updated', {
        organization_id: organization?.id,
        changes: Object.keys(branding),
      }, 'admin_action');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update branding';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (organization?.branding) {
      setBranding(organization.branding);
      setHasChanges(false);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
    
    if (!previewMode) {
      // Apply preview styles
      const root = document.documentElement;
      if (branding.primaryColor) {
        root.style.setProperty('--primary', branding.primaryColor);
      }
      if (branding.secondaryColor) {
        root.style.setProperty('--secondary', branding.secondaryColor);
      }
      if (branding.accentColor) {
        root.style.setProperty('--accent', branding.accentColor);
      }
      if (branding.fontFamily) {
        root.style.setProperty('--font-family', branding.fontFamily);
      }
    } else {
      // Restore original styles
      if (organization?.branding) {
        const root = document.documentElement;
        if (organization.branding.primaryColor) {
          root.style.setProperty('--primary', organization.branding.primaryColor);
        }
        if (organization.branding.secondaryColor) {
          root.style.setProperty('--secondary', organization.branding.secondaryColor);
        }
        if (organization.branding.accentColor) {
          root.style.setProperty('--accent', organization.branding.accentColor);
        }
        if (organization.branding.fontFamily) {
          root.style.setProperty('--font-family', organization.branding.fontFamily);
        }
      }
    }
  };

  if (!canCustomize) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding Customization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>You do not have permission to modify organization branding.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Brand Customization
          </h2>
          <p className="text-muted-foreground">
            Customize your organization's branding and visual identity
          </p>
        </div>
        
        {organization?.tier === 'enterprise' && (
          <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100">
            Enterprise Feature
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode ? "default" : "outline"}
            size="sm"
            onClick={handlePreview}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Stop Preview' : 'Preview Changes'}
          </Button>
          
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              Unsaved Changes
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges || isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Customization Tabs */}
      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Brand Identity */}
        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Brand Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="appName">Application Name</Label>
                <Input
                  id="appName"
                  value={branding.applicationName || ''}
                  onChange={(e) => handleInputChange('applicationName', e.target.value)}
                  placeholder="MAD LAB Workbench"
                />
              </div>
              
              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={branding.logoUrl || ''}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 200x50px (PNG or SVG)
                </p>
              </div>
              
              <div>
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  value={branding.faviconUrl || ''}
                  onChange={(e) => handleInputChange('faviconUrl', e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 32x32px (ICO or PNG)
                </p>
              </div>
              
              <div>
                <Label htmlFor="footerText">Footer Text</Label>
                <Input
                  id="footerText"
                  value={branding.footerText || ''}
                  onChange={(e) => handleInputChange('footerText', e.target.value)}
                  placeholder="© 2024 Your Company. All rights reserved."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors */}
        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color Scheme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Presets */}
              <div>
                <Label className="text-base">Color Presets</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {COLOR_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      onClick={() => handleColorPreset(preset)}
                      className="p-3 h-auto flex items-center gap-3"
                    >
                      <div className="flex gap-1">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                      <span className="text-sm">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Custom Colors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={branding.primaryColor || '#2563eb'}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      className="w-12 h-10 p-1 rounded"
                    />
                    <Input
                      value={branding.primaryColor || '#2563eb'}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#2563eb"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={branding.secondaryColor || '#64748b'}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      className="w-12 h-10 p-1 rounded"
                    />
                    <Input
                      value={branding.secondaryColor || '#64748b'}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#64748b"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="accentColor"
                      type="color"
                      value={branding.accentColor || '#f59e0b'}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      className="w-12 h-10 p-1 rounded"
                    />
                    <Input
                      value={branding.accentColor || '#f59e0b'}
                      onChange={(e) => handleInputChange('accentColor', e.target.value)}
                      placeholder="#f59e0b"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography */}
        <TabsContent value="typography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Typography
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                <select
                  id="fontFamily"
                  value={branding.fontFamily || 'system-ui, sans-serif'}
                  onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure to include the font in your application
                </p>
              </div>

              {/* Font Preview */}
              <div className="border border-border rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Preview</p>
                <div style={{ fontFamily: branding.fontFamily || 'system-ui, sans-serif' }}>
                  <h1 className="text-2xl font-bold">Sample Heading</h1>
                  <p className="text-base">This is how your text will appear with the selected font family.</p>
                  <p className="text-sm text-muted-foreground">Secondary text and descriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Advanced Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customCss">Custom CSS</Label>
                <Textarea
                  id="customCss"
                  value={branding.customCss || ''}
                  onChange={(e) => handleInputChange('customCss', e.target.value)}
                  placeholder={`/* Custom CSS styles */
:root {
  --custom-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.custom-button {
  border-radius: 12px;
  box-shadow: var(--custom-shadow);
}`}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add custom CSS to override default styles. Use with caution.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Advanced Feature</p>
                    <p className="text-yellow-700 mt-1">
                      Custom CSS can affect application functionality. Test thoroughly before deploying.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Status */}
      {previewMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Eye className="h-4 w-4" />
              <span className="font-medium">Preview Mode Active</span>
              <span className="text-sm">Your changes are temporarily applied</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BrandingCustomizer;