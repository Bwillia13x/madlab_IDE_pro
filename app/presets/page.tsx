'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceStore } from '@/lib/store';

type Preset = { id: string; name: string; sheet: string; tags: string[]; desc?: string; layout: string[] };

const TAGS = ['Fundamentals','DCF','Comps','TA','Momentum','Risk','VaR','Stress','Options','Greeks','Vol','Research','Macro','Beginner','Blank'];
const BUILTIN: Preset[] = [
  { id: 'valuation', name: 'Valuation', sheet: 'valuation', tags: ['Fundamentals','DCF','Comps'], desc: 'DCF + revenue/margin KPIs and peers.', layout: ['kpiRev','kpiMarg','dcf','peers'] },
  { id: 'charting', name: 'Charting', sheet: 'charting', tags: ['TA','Momentum'], desc: 'Interactive price chart + heat + bars.', layout: ['px','heat','bars'] },
  { id: 'risk', name: 'Risk', sheet: 'risk', tags: ['Risk','VaR','Stress'], desc: 'Parametric VaR/ES with stress widgets.', layout: ['var','stress','corr'] },
  { id: 'options', name: 'Options', sheet: 'options', tags: ['Options','Greeks','Vol'], desc: 'BS pricer, cone, strategy builder.', layout: ['bs','cone','strat'] },
  { id: 'blank', name: 'Blank', sheet: 'blank', tags: ['Blank','Beginner'], desc: 'Empty canvas for custom layouts.', layout: ['blank'] },
];

function storageKey(sheet: string) { return `madlab_layout_${sheet}`; }
function loadUserPresets(): Preset[] { try { return JSON.parse(localStorage.getItem('madlab_user_presets') || '[]'); } catch { return []; } }
function saveUserPresets(arr: Preset[]) { localStorage.setItem('madlab_user_presets', JSON.stringify(arr)); }

function drawMini(canvas: HTMLCanvasElement, preset: Preset) {
  const ctx = canvas.getContext('2d'); if (!ctx) return; const W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.strokeRect(0, 0, W, H);
  const boxes = layoutBoxes(preset);
  ctx.fillStyle = 'rgba(125,200,247,.75)'; boxes.forEach((b) => { ctx.fillRect(b.x * W, b.y * H, b.w * W, b.h * H); });
}

function layoutBoxes(p: Preset) {
  if (p.sheet === 'valuation') return [ {x:.00,y:.00,w:.24,h:.32}, {x:.26,y:.00,w:.24,h:.32}, {x:.52,y:.00,w:.46,h:.64}, {x:.00,y:.36,w:.48,h:.28} ];
  if (p.sheet === 'charting')  return [ {x:.00,y:.00,w:.66,h:.64}, {x:.68,y:.00,w:.30,h:.30}, {x:.68,y:.34,w:.30,h:.30} ];
  if (p.sheet === 'risk')      return [ {x:.00,y:.00,w:.32,h:.46}, {x:.34,y:.00,w:.32,h:.46}, {x:.68,y:.00,w:.30,h:.46} ];
  if (p.sheet === 'options')   return [ {x:.00,y:.00,w:.60,h:.64}, {x:.62,y:.00,w:.36,h:.30}, {x:.62,y:.34,w:.36,h:.30} ];
  if (p.sheet === 'blank')     return [ {x:.00,y:.00,w:1.00,h:.64} ];
  return [ {x:.00,y:.00,w:1,h:.3} ];
}

export default function PresetGalleryPage() {
  const { theme, setTheme } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showBuiltin, setShowBuiltin] = useState(true);
  const [showUser, setShowUser] = useState(true);
  const [selected, setSelected] = useState<Preset | null>(null);
  const [userPresets, setUserPresets] = useState<Preset[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => { setUserPresets(loadUserPresets()); }, []);
  useEffect(() => { if (selected && canvasRef.current) drawMini(canvasRef.current, selected); }, [selected]);

  const all = useMemo(() => [ ...(showBuiltin ? BUILTIN : []), ...(showUser ? userPresets : []) ], [showBuiltin, showUser, userPresets]);
  const filtered = useMemo(() => all.filter(p => (!activeTag || p.tags?.includes(activeTag)) && (!query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.tags||[]).join(' ').toLowerCase().includes(query.toLowerCase()))), [all, activeTag, query]);

  const applyPreset = () => {
    if (!selected) return;
    localStorage.setItem(storageKey(selected.sheet), JSON.stringify(selected.layout));
    localStorage.setItem('sheet', selected.sheet);
  };
  const clonePreset = () => {
    if (!selected) return;
    const baseId = selected.id.startsWith('user:') ? selected.id.split(':')[1] : selected.id;
    const id = `user:${baseId}-${Math.random().toString(36).slice(2, 6)}`;
    const copy = { ...selected, id, name: selected.name + ' (copy)' };
    const next = [...loadUserPresets(), copy];
    saveUserPresets(next); setUserPresets(next);
  };
  const setDefault = () => { if (selected) localStorage.setItem('madlab_default_preset', selected.id); };
  const newFromCurrent = () => {
    const sheet = localStorage.getItem('sheet') || 'valuation';
    let order: string[] = [];
    try { order = JSON.parse(localStorage.getItem(storageKey(sheet)) || '[]'); } catch { order = []; }
    if (order.length === 0) {
      const b = BUILTIN.find(x => x.sheet === sheet); order = b ? b.layout.slice() : [];
    }
    const id = `user:${sheet}-${Math.random().toString(36).slice(2, 6)}`;
    const name = prompt(`Preset name for current ${sheet} layout:`, `My ${sheet} preset`);
    if (!name) return;
    const preset: Preset = { id, name, sheet, layout: order, tags: ['My Preset', sheet], desc: `Saved from Workbench (${sheet}).` };
    const next = [...loadUserPresets(), preset]; saveUserPresets(next); setUserPresets(next); setSelected(preset);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(125,200,247,0.25),transparent_55%),radial-gradient(800px_520px_at_85%_8%,rgba(255,126,182,0.18),transparent_60%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))) ]">
      {/* Titlebar */}
      <div className="h-14 flex items-center gap-3 px-4 border-b bg-[linear-gradient(180deg,rgba(125,200,247,0.08),rgba(255,255,255,0.02))]">
        <div className="w-5 h-5 rounded-md bg-[conic-gradient(from_120deg,#7DC8F7,#FFD29D,#FF7EB6,#7DC8F7)] shadow-[0_0_8px_rgba(125,200,247,0.55)]" />
        <div className="font-semibold tracking-wide">MAD LAB — Preset Gallery</div>
        <Badge variant="outline" className="ml-1">/presets</Badge>
        <div className="flex-1" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search presets, tags… (⌘K)" className="w-72 h-8" />
        <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
          <SelectTrigger className="w-36 h-8 ml-3"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="malibu-sunrise">Sunrise</SelectItem>
            <SelectItem value="malibu-sunset">Sunset</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-[260px_1fr_420px] grid-cols-1 gap-2 p-2 min-h-[calc(100vh-56px)]">
        {/* Left: Filters */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Filters</div><div className="text-[11px] px-2 py-0.5 rounded-full border">{filtered.length}</div></div>
          <div className="p-2">
            <div className="text-[12px] text-muted-foreground mb-1">Tags</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {TAGS.map(t => (
                <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} className={`px-2.5 py-1 rounded-full border text-xs ${activeTag === t ? 'outline outline-1 outline-primary/60' : ''}`}>{t}</button>
              ))}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <label className="flex items-center gap-2"><input type="checkbox" checked={showBuiltin} onChange={(e) => setShowBuiltin(e.target.checked)} /> Built-in</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={showUser} onChange={(e) => setShowUser(e.target.checked)} /> My presets</label>
            </div>
          </div>
        </Card>

        {/* Center: Cards */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Presets</div><div className="text-[11px] px-2 py-0.5 rounded-full border">click to preview</div></div>
          <div className="p-2">
            <div className="grid grid-cols-12 auto-rows-[220px] gap-2">
              {filtered.map(p => (
                <button key={p.id} onClick={() => setSelected(p)} className="col-span-12 md:col-span-4 border rounded-lg p-2 hover:shadow-[inset_0_0_0_2px_rgba(125,200,247,.25)] text-left">
                  <div className="flex items-center justify-between mb-1"><div className="text-sm font-medium">{p.name}</div><span className="text-[11px] px-2 py-0.5 rounded-full border">{p.sheet}</span></div>
                  <div className="grid place-items-center border border-dashed rounded h-[110px] mb-2"><canvas width={180} height={100} ref={(el) => { if (el) drawMini(el, p); }} /></div>
                  <div className="text-xs text-muted-foreground mb-1">{p.desc || ''}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-1">{(p.tags || []).map(t => (<span key={t} className="text-[11px] px-2 py-0.5 rounded-full border">{t}</span>))}</div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Right: Preview + Actions */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Preview</div><div className="text-[11px] px-2 py-0.5 rounded-full border">{selected?.id || '—'}</div></div>
          <div className="p-2">
            <div className="text-sm font-medium mb-1">{selected?.name || 'Select a preset'}</div>
            <div className="text-xs text-muted-foreground">{selected?.desc || ''}</div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-1 my-2">{(selected?.tags || []).map(t => (<span key={t} className="text-[11px] px-2 py-0.5 rounded-full border">{t}</span>))}</div>
            <div className="border border-dashed rounded p-2 bg-background/40"><canvas ref={canvasRef} width={360} height={240} /></div>
            <div className="flex gap-2 flex-wrap mt-2">
              <Button disabled={!selected} onClick={applyPreset}>Use as layout</Button>
              <Button variant="secondary" disabled={!selected} onClick={clonePreset}>Clone</Button>
              <Button variant="outline" disabled={!selected} onClick={setDefault}>Set as default</Button>
              <Button variant="ghost" onClick={newFromCurrent}>New from current…</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


