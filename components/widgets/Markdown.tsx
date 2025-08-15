'use client';

import React, { useState } from 'react';
import { FileText, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WidgetProps, WidgetDefinition } from '@/lib/widgets/schema';
import { createWidgetSchema } from '@/lib/widgets/schema';
import { z } from 'zod';

// Configuration schema for Markdown widget
const MarkdownConfigSchema = createWidgetSchema(
  z.object({
    content: z
      .string()
      .default('# Welcome\n\nStart typing your markdown content here...')
      .describe('Markdown content'),
    fontSize: z.number().min(8).max(24).default(14).describe('Font size in pixels'),
    showToolbar: z.boolean().default(true).describe('Show editing toolbar'),
    defaultMode: z.enum(['edit', 'preview']).default('preview').describe('Default display mode'),
    enableAutoSave: z.boolean().default(true).describe('Auto-save content changes'),
  })
);

type MarkdownConfig = z.infer<typeof MarkdownConfigSchema>;

// Simple markdown renderer (for demo purposes - in production, use a proper markdown library)
function renderMarkdown(content: string): string {
  return content
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-2">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-2">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-medium mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/\n\n/gim, '</p><p class="mb-2">')
    .replace(/\n/gim, '<br>')
    .replace(/^(.*)$/, '<p class="mb-2">$1</p>');
}

function MarkdownComponent({ id, config, onConfigChange }: WidgetProps) {
  const typedConfig = config as MarkdownConfig;
  const [mode, setMode] = useState<'edit' | 'preview'>(typedConfig.defaultMode);
  const [localContent, setLocalContent] = useState(typedConfig.content);

  // Auto-save functionality
  React.useEffect(() => {
    if (typedConfig.enableAutoSave && localContent !== typedConfig.content) {
      const timer = setTimeout(() => {
        onConfigChange?.({ ...typedConfig, content: localContent });
      }, 1000); // Save after 1 second of no changes

      return () => clearTimeout(timer);
    }
  }, [localContent, typedConfig, onConfigChange]);

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
  };

  const toggleMode = () => {
    const newMode = mode === 'edit' ? 'preview' : 'edit';
    setMode(newMode);

    // Save content when switching to preview
    if (newMode === 'preview' && localContent !== typedConfig.content) {
      onConfigChange?.({ ...typedConfig, content: localContent });
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      role="region"
      aria-label="Markdown notes"
      data-testid="markdown-widget"
    >
      {typedConfig.showToolbar && (
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">
              {typedConfig.title || 'Markdown Notes'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={mode === 'edit' ? 'default' : 'secondary'}>
              {mode === 'edit' ? 'Editing' : 'Preview'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className="h-7 px-2"
              data-testid="markdown-toggle-mode"
              aria-label={mode === 'edit' ? 'Switch to preview mode' : 'Switch to edit mode'}
            >
              {mode === 'edit' ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </>
              ) : (
                <>
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {mode === 'edit' ? (
          <Textarea
            value={localContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Type your markdown content here..."
            className="h-full resize-none border-none rounded-none focus-visible:ring-0"
            style={{ fontSize: `${typedConfig.fontSize}px` }}
            aria-label="Markdown editor"
            data-testid="markdown-editor"
          />
        ) : (
          <Card className="h-full overflow-auto border-none rounded-none">
            <CardContent
              className="p-4 prose prose-invert max-w-none"
              style={{ fontSize: `${typedConfig.fontSize}px` }}
            >
              <div
                className="text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(typedConfig.content),
                }}
                role="document"
                aria-label="Markdown preview"
                data-testid="markdown-preview"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Widget definition conforming to the SDK
export const MarkdownDefinition: WidgetDefinition = {
  meta: {
    type: 'markdown',
    name: 'Markdown Notes',
    description: 'Rich text editor with markdown support for notes and documentation',
    category: 'utility',
    version: '1.0.0',
    configSchema: MarkdownConfigSchema,
    defaultConfig: {
      title: 'Markdown Notes',
      content:
        '# Welcome\n\nStart typing your markdown content here...\n\n## Features\n\n- **Bold text**\n- *Italic text*\n- `Inline code`\n- Headers\n\n### Getting Started\n\nClick the Edit button to start writing!',
      fontSize: 14,
      showToolbar: true,
      defaultMode: 'preview',
      enableAutoSave: true,
    },
    defaultSize: { w: 6, h: 4 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: false,
      exportable: true,
      realTimeData: false,
    },
    tags: ['notes', 'markdown', 'text', 'documentation'],
    icon: FileText,
  },
  runtime: {
    component: MarkdownComponent,
    hooks: {
      onCreate: (config) => {
        console.log('Markdown widget created with config:', config);
      },
      onUpdate: (config, prevConfig) => {
        if (config.content !== prevConfig.content) {
          console.log('Markdown content updated');
        }
      },
    },
  },
};

// Export the component for backward compatibility
export function Markdown(props: WidgetProps) {
  return <MarkdownComponent {...props} />;
}

// Default export for lazy import via getLazyWidget('Markdown')
export default function MarkdownDefault(props: WidgetProps) {
  return <MarkdownComponent {...props} />;
}
