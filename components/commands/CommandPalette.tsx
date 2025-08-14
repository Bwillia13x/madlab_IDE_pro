"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getCommands, type CommandItem as Cmd } from "@/lib/commands";
import { analytics } from "@/lib/analytics";
import { useWorkspaceStore } from "@/lib/store";
import { TemplatePickerDialog } from "@/components/editor/TemplatePickerDialog";


export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // base commands from registry
  const base = useMemo(() => getCommands(), []);

  // workspace specific commands that need component context
  const workspaceCommands: Cmd[] = useMemo(() => {
    // reference `open` so linter understands the dependency
    void open;
    const cmds: Cmd[] = [
      {
        id: "workspace-export",
        group: "Workspace",
        title: "Export Workspace…",
        run: () => {
          const data = useWorkspaceStore.getState().exportWorkspace();
          const blob = new Blob([data], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const ts = new Date().toISOString().replace(/[:.]/g, "-");
          a.href = url;
          a.download = `madlab-workspace-${ts}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        },
      },
      {
        id: 'skill-beginner',
        group: 'Help',
        title: 'Set Skill Level: Beginner',
        run: () => useWorkspaceStore.getState().setSkillLevel('beginner')
      },
      {
        id: 'skill-intermediate',
        group: 'Help',
        title: 'Set Skill Level: Intermediate',
        run: () => useWorkspaceStore.getState().setSkillLevel('intermediate')
      },
      {
        id: 'skill-advanced',
        group: 'Help',
        title: 'Set Skill Level: Advanced',
        run: () => useWorkspaceStore.getState().setSkillLevel('advanced')
      },
      {
        id: "privacy-enable-analytics",
        group: "Privacy",
        title: "Enable Analytics",
        enabled: () => {
          try { return typeof window !== 'undefined' && localStorage.getItem('madlab_consent_analytics') !== 'true'; } catch { return true; }
        },
        run: async () => {
          try {
            localStorage.setItem('madlab_consent_analytics', 'true');
          } catch {}
          analytics.setEnabled(true);
        },
      },
      {
        id: "privacy-disable-analytics",
        group: "Privacy",
        title: "Disable Analytics",
        enabled: () => {
          try { return typeof window !== 'undefined' && localStorage.getItem('madlab_consent_analytics') === 'true'; } catch { return false; }
        },
        run: async () => {
          try {
            localStorage.setItem('madlab_consent_analytics', 'false');
          } catch {}
          analytics.setEnabled(false);
        },
      },
      {
        id: "workspace-import",
        group: "Workspace",
        title: "Import Workspace…",
        run: () => fileInputRef.current?.click(),
      },
      {
        id: "toggle-inspector",
        group: "View",
        title: "Toggle Inspector",
        run: () => {
          useWorkspaceStore.getState().toggleInspector();
        },
      },
      // Onboarding controls
      {
        id: 'onboarding-restart',
        group: 'Help',
        title: 'Restart Onboarding Tour',
        run: () => {
          try {
            localStorage.removeItem('madlab_onboarding_completed');
            useWorkspaceStore.getState().safeUpdate?.({ onboardingCompleted: false });
            // Reload page tour via simple prompt
            window.location.reload();
          } catch {}
        }
      },
      {
        id: 'celebrate-demo',
        group: 'Help',
        title: 'Show Success Celebration (demo)',
        run: () => {
          try { useWorkspaceStore.getState().celebrate?.('Analysis saved successfully'); } catch {}
        }
      },
      {
        id: "toggle-data-provider",
        group: "Data",
        title: "Toggle Data Provider",
        run: async () => {
          const state = useWorkspaceStore.getState();
          const current = state.getDataProvider();
          const next = current === 'mock' ? 'extension' : 'mock';
          await state.setDataProvider(next);
        },
      },
    ];

    // Templates: save current sheet
    cmds.push({
      id: "template-save-current",
      group: "Templates",
      title: "Save Current Sheet as Template…",
      enabled: () => !!useWorkspaceStore.getState().activeSheetId,
      run: () => {
        const state = useWorkspaceStore.getState();
        const sheetId = state.activeSheetId;
        if (!sheetId) return;
        const current = state.sheets.find((s) => s.id === sheetId);
        const defName = current?.title || "My Template";
        // Defer prompt to the next tick so Playwright can attach dialog handler
        setTimeout(() => {
          const name = window.prompt("Template name", defName)?.trim();
          const finalName = name && name.length > 0 ? name : defName;
          state.saveTemplate(finalName, sheetId);
        }, 0);
      },
    });

    // Templates: dynamic commands for saved templates
    try {
      const tpls = useWorkspaceStore.getState().getTemplates();
      for (const tpl of tpls) {
        cmds.push({
          id: `template-new-${tpl.name}`,
          group: "Templates",
          title: `New Sheet from Template: ${tpl.name}`,
          keywords: [tpl.title, tpl.kind, tpl.name],
          run: () => {
            useWorkspaceStore.getState().createSheetFromTemplate(tpl.name);
          },
        });
      }
    } catch {
      // no-op
    }

    // Entry point to open full template picker dialog
    cmds.push({
      id: "template-picker-open",
      group: "Templates",
      title: "New Sheet from Template…",
      run: async () => {
        setTemplateDialogOpen(true);
      },
    });

    return cmds;
    // Intentionally recompute when palette opens/closes to refresh template list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commands = useMemo(() => [...workspaceCommands, ...base], [workspaceCommands, base]);

  // Global shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K' || e.code === 'KeyK';
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        // Always open to avoid double-mount StrictMode toggling back to closed
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    document.addEventListener("keydown", handler);
    // Custom events for external triggers
    const onOpen = () => setOpen(true);
    const onToggle = () => setOpen((v) => !v);
    window.addEventListener("madlab:open-command-palette", onOpen as EventListener);
    window.addEventListener("madlab:toggle-command-palette", onToggle as EventListener);
    return () => {
      window.removeEventListener("keydown", handler);
      document.removeEventListener("keydown", handler);
      window.removeEventListener("madlab:open-command-palette", onOpen as EventListener);
      window.removeEventListener("madlab:toggle-command-palette", onToggle as EventListener);
    };
  }, []);

  // handle command selection
  const runCommand = async (cmd: Cmd) => {
    if (cmd.enabled && !cmd.enabled()) return;
    await cmd.run();
    setOpen(false);
  };

  // group by cmd.group
  const groups = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    for (const c of commands) {
      const g = c.group || "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return Array.from(map.entries());
  }, [commands]);

  return (
    <>
      {/* hidden file input for imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        aria-label="Import workspace JSON file"
        title="Import workspace JSON file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const ok = useWorkspaceStore.getState().importWorkspace(text);
          if (ok) {
            // no toast to keep minimal surface
            setOpen(false);
          }
          // reset input to allow re-selecting same file later
          e.currentTarget.value = "";
        }}
      />

      <CommandDialog data-testid="command-palette" open={open} onOpenChange={setOpen}>
        <CommandInput data-testid="command-search" placeholder="Type a command or search… (⌘K)" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {(() => {
            try {
              const tpls = useWorkspaceStore.getState().getTemplates();
              return (
                <CommandGroup heading="Templates">
                  <CommandItem
                    value="New Sheet from Template…"
                    onSelect={() => {
                      setTemplateDialogOpen(true);
                    }}
                  >
                    New Sheet from Template…
                  </CommandItem>
                  {tpls.map((t) => (
                    <CommandItem
                      key={`tpl-${t.name}`}
                      value={`Template ${t.name} ${t.title} ${t.kind}`}
                      onSelect={() => {
                        useWorkspaceStore.getState().createSheetFromTemplate(t.name);
                        setOpen(false);
                      }}
                    >
                      New from template: {t.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            } catch {}
            return null;
          })()}
          {groups.map(([heading, items]) => (
            <CommandGroup key={heading} heading={heading}>
              {items.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  data-testid="command-item"
                  value={[cmd.title, ...(cmd.keywords || [])].join(' ')}
                  disabled={cmd.enabled ? !cmd.enabled() : false}
                  onSelect={() => runCommand(cmd)}
                >
                  {cmd.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
        </CommandList>
      </CommandDialog>
      <TemplatePickerDialog
        open={templateDialogOpen}
        onOpenChange={(v) => setTemplateDialogOpen(v)}
        onCreate={(name) => {
          useWorkspaceStore.getState().createSheetFromTemplate(name);
          setTemplateDialogOpen(false);
          setOpen(false);
        }}
      />
    </>
  );
}
