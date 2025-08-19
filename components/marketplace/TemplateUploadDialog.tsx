'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus, Save } from 'lucide-react';
import { templateSharingService } from '@/lib/marketplace/sharing';
import { useWorkspaceStore } from '@/lib/store';
import { toast } from 'sonner';

interface TemplateUploadDialogProps {
  onUploadComplete?: () => void;
}

export function TemplateUploadDialog({ onUploadComplete }: TemplateUploadDialogProps) {
  const { sheets, activeSheetId } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Get current sheet from activeSheetId
  const currentSheet = sheets.find(sheet => sheet.id === activeSheetId);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    kind: 'charting',
    tags: [] as string[],
    version: '1.0.0',
    isPublic: true,
    allowForking: true,
    license: 'MIT'
  });
  const [newTag, setNewTag] = useState('');

  const handleUpload = async () => {
    if (!currentSheet) {
      toast.error('No active sheet to upload');
      return;
    }

    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      // Extract widgets from current sheet
      const widgets = currentSheet.widgets.map(widget => ({
        type: widget.type,
        title: widget.title,
        layout: widget.layout,
        props: widget.props
      }));

      const result = await templateSharingService.shareTemplate({
        id: '',
        title: formData.title,
        description: formData.description,
        kind: formData.kind,
        widgets,
        author: 'Current User', // In a real app, this would come from user auth
        tags: formData.tags,
        version: formData.version,
        compatibility: ['v1.0+'],
        isPublic: formData.isPublic,
        allowForking: formData.allowForking,
        license: formData.license
      });

      if (result.success) {
        toast.success('Template uploaded successfully!');
        setOpen(false);
        onUploadComplete?.();
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          kind: 'charting',
          tags: [],
          version: '1.0.0',
          isPublic: true,
          allowForking: true,
          license: 'MIT'
        });
      } else {
        toast.error(result.error || 'Failed to upload template');
      }
    } catch {
      toast.error('An error occurred while uploading the template');
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-1" />
          Upload Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Template to Marketplace</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Template Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter template title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kind">Category *</Label>
                <Select value={formData.kind} onValueChange={(value) => setFormData(prev => ({ ...prev, kind: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="charting">Charting</SelectItem>
                    <SelectItem value="options">Options</SelectItem>
                    <SelectItem value="risk">Risk</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template does and how to use it"
                rows={3}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tags</h3>
            
            <div className="space-y-2">
              <Label htmlFor="newTag">Add Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="newTag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter tag and press Enter"
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                      aria-label={`Remove tag ${tag}`}
                      title={`Remove tag ${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0.0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="license">License</Label>
                <Select value={formData.license} onValueChange={(value) => setFormData(prev => ({ ...prev, license: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIT">MIT</SelectItem>
                    <SelectItem value="Apache-2.0">Apache 2.0</SelectItem>
                    <SelectItem value="GPL-3.0">GPL 3.0</SelectItem>
                    <SelectItem value="CC-BY-4.0">Creative Commons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                  aria-label="Make template public"
                />
                <Label htmlFor="isPublic">Make template public</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowForking"
                  checked={formData.allowForking}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowForking: e.target.checked }))}
                  className="rounded"
                  aria-label="Allow others to fork this template"
                />
                <Label htmlFor="allowForking">Allow others to fork this template</Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          {currentSheet && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Template Preview</h3>
              
              <div className="border rounded p-4 bg-muted">
                <div className="text-sm font-medium mb-2">Current Sheet: {currentSheet.title}</div>
                <div className="text-sm text-muted-foreground mb-3">
                  {currentSheet.widgets.length} widget{currentSheet.widgets.length !== 1 ? 's' : ''}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {currentSheet.widgets.slice(0, 6).map((widget, index) => (
                    <div
                      key={index}
                      className="h-8 bg-background rounded text-xs flex items-center justify-center text-muted-foreground"
                    >
                      {widget.type}
                    </div>
                  ))}
                  {currentSheet.widgets.length > 6 && (
                    <div className="h-8 bg-background rounded text-xs flex items-center justify-center text-muted-foreground">
                      +{currentSheet.widgets.length - 6}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !formData.title || !formData.description}
            >
              <Save className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
