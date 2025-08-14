/**
 * Template slice
 */

export function createTemplateSlice(set: any, get: any): Record<string, unknown> {
  return {
    getTemplates: () => {
      try {
        // Feature flag: prefer DB if configured
        // eslint-disable-next-line no-process-env
        const ff = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DB_MODE) as string | undefined
        if (ff === 'db') {
          // Lazy import to avoid client bundle cost when not used
          return []
        }
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('madlab-templates') : null;
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr as any[];
      } catch {
        return [];
      }
    },
    saveTemplate: (name: string, sheetId: string) => {
      try {
        const state = get();
        const sheet = (state as any).sheets.find((s: any) => s.id === sheetId);
        if (!sheet) return false;
        const template = {
          name,
          kind: sheet.kind,
          title: sheet.title,
          widgets: sheet.widgets.map((w: any) => ({ type: w.type, title: w.title, layout: { ...w.layout, i: '' }, props: w.props ? { ...w.props } : undefined })),
        };
        // eslint-disable-next-line no-process-env
        const ff = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DB_MODE) as string | undefined
        if (ff === 'db') {
          // Fire-and-forget to API; UI remains optimistic
          fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) }).catch(() => {})
        } else {
          const existing = (get() as any).getTemplates();
          const next = [...existing.filter((t: any) => t.name !== name), template];
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('madlab-templates', JSON.stringify(next));
            try { window.localStorage.setItem('madlab_recent_template', name); } catch {}
          }
        }
        try { (get() as any).celebrate('Template saved'); } catch {}
        try {
          // Mark learning milestone and track conversion
          const s = get() as any;
          s.safeUpdate?.({ learningProgress: { ...s.learningProgress, savedTemplate: true } });
          const analytics = require('@/lib/analytics').default;
          const { getOnboardingVariant } = require('@/lib/analytics/experiments');
          if (typeof window !== 'undefined' && window.localStorage.getItem('madlab_first_template') !== 'true') {
            analytics.track('conversion', { event: 'first_template', variant: getOnboardingVariant() }, 'user_flow');
            window.localStorage.setItem('madlab_first_template', 'true');
          }
        } catch {}
        return true;
      } catch { return false; }
    },
    createSheetFromTemplate: (name: string) => {
      try {
        const tpl = (get() as any).getTemplates().find((t: any) => t.name === name);
        if (!tpl) return false;
        const sheetName = tpl.title || name;
        const idBefore = (get() as any).activeSheetId;
        (get() as any).addSheet(tpl.kind || 'blank', sheetName);
        const sheetId = (get() as any).activeSheetId;
        if (!sheetId || sheetId === idBefore) return false;
        set((state: any) => ({ sheets: state.sheets.map((s: any) => (s.id === sheetId ? { ...s, widgets: [] } : s)) }));
        for (const w of tpl.widgets as any[]) { (get() as any).addWidget(sheetId, w); }
        try {
          const analytics = require('@/lib/analytics').default;
          analytics.track('template_used', { name }, 'feature_usage');
          try { if (typeof window !== 'undefined') window.localStorage.setItem('madlab_recent_template', name); } catch {}
        } catch {}
        return true;
      } catch { return false; }
    },
    deleteTemplate: (name: string) => {
      try {
        // eslint-disable-next-line no-process-env
        const ff = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DB_MODE) as string | undefined
        if (ff === 'db') {
          fetch(`/api/templates?name=${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {})
        } else {
          const existing = (get() as any).getTemplates();
          const next = existing.filter((t: any) => t.name !== name);
          if (typeof window !== 'undefined') window.localStorage.setItem('madlab-templates', JSON.stringify(next));
        }
        return true;
      } catch { return false; }
    },
    renameTemplate: (oldName: string, newName: string) => {
      try {
        // eslint-disable-next-line no-process-env
        const ff = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DB_MODE) as string | undefined
        if (ff === 'db') {
          // Read then write via API
          fetch(`/api/templates?name=${encodeURIComponent(oldName)}`).then(r => r.json()).then(async (res) => {
            const tpl = res?.template
            if (!tpl) return
            await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tpl, name: newName }) })
            await fetch(`/api/templates?name=${encodeURIComponent(oldName)}`, { method: 'DELETE' })
          }).catch(() => {})
        } else {
          const existing = (get() as any).getTemplates();
          const found = existing.find((t: any) => t.name === oldName);
          if (!found) return false;
          const updated = { ...found, name: newName };
          const next = [...existing.filter((t: any) => t.name !== oldName && t.name !== newName), updated];
          if (typeof window !== 'undefined') window.localStorage.setItem('madlab-templates', JSON.stringify(next));
        }
        return true;
      } catch { return false; }
    },
  };
}


