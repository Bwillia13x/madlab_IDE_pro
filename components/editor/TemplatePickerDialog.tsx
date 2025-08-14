'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/lib/store';

type TemplateInfo = ReturnType<typeof useWorkspaceStore.getState>['getTemplates'] extends () => infer T ? T extends Array<infer U> ? U : never : never;

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (templateName: string) => void;
}

export function TemplatePickerDialog({ open, onOpenChange, onCreate }: TemplatePickerDialogProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { deleteTemplate, renameTemplate } = useWorkspaceStore();

  // Load templates on open
  useEffect(() => {
    if (!open) return;
    try {
      const t = useWorkspaceStore.getState().getTemplates();
      setTemplates(t);
      if (t.length > 0) setSelected(t[0].name);
    } catch {
      setTemplates([]);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      [t.name, t.title, t.kind, String(t.widgets?.length || 0)].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [query, templates]);

  const onConfirm = () => {
    if (selected) onCreate(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>New Sheet from Template</DialogTitle>
          <DialogDescription>Select a saved template or search by name.</DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-3">
          <Input
            placeholder="Search templates by name, kind, or count"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm();
            }}
            aria-label="Search templates"
            data-testid="template-search"
          />
        </div>
        <ScrollArea className="max-h-72">
          <div ref={listRef} role="listbox" aria-label="Saved templates" className="px-2 py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground">No templates found.</div>
            )}
            {filtered.map((t) => (
              <div
                key={t.name}
                role="option"
                aria-selected={selected === t.name}
                data-testid={`template-row-${t.name.replace(/\s+/g, '-')}`}
                className={`flex items-center justify-between gap-2 rounded px-3 py-2 text-sm cursor-pointer hover:bg-accent ${selected === t.name ? 'bg-accent' : ''}`}
                onClick={() => setSelected(t.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelected(t.name);
                    e.preventDefault();
                  }
                }}
                tabIndex={0}
              >
                <div className="flex min-w-0 flex-col">
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.kind} • {t.widgets?.length || 0} widgets</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = window.prompt('Rename template', t.name)?.trim();
                      if (newName && newName.length > 0 && newName !== t.name) {
                        const ok = renameTemplate(t.name, newName);
                        if (ok) {
                          const next = useWorkspaceStore.getState().getTemplates();
                          setTemplates(next);
                          setSelected(newName);
                        }
                      }
                    }}
                    aria-label={`Rename ${t.name}`}
                    data-testid={`template-rename-${t.name.replace(/\s+/g, '-')}`}
                  >
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      const ok = deleteTemplate(t.name);
                      if (ok) {
                        const next = useWorkspaceStore.getState().getTemplates();
                        setTemplates(next);
                        setSelected(next[0]?.name ?? null);
                      }
                    }}
                    aria-label={`Delete ${t.name}`}
                    data-testid={`template-delete-${t.name.replace(/\s+/g, '-')}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={!selected} data-testid="template-create">Create Sheet</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


