import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Eye, EyeOff, Loader2, Lock, Plus, RotateCcw, Square, Trash2, Type, Unlock } from "lucide-react";
import { ColorField, Section, Slider } from "./controls";
import { downloadBlob, exportPoster, fileName, renderThumbnail } from "@/lib/exporter";
import { buildPalettes, DEFAULT_PALETTE, type NamedPalette } from "@/lib/palette";
import { duplicateLayer, getLayers, withTemplate } from "@/lib/project";
import { isDrawable } from "@/lib/renderer";
import { getTemplate, TEMPLATES, text as mkText, uid } from "@/lib/templates";
import type { ExportFormat, Layer, Project } from "@/lib/types";

type Setter = (fn: (p: Project) => Project, transient?: boolean) => void;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function TemplateSection({ project, set }: { project: Project; set: Setter }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const out: Record<string, string> = {};
      for (const tpl of TEMPLATES) {
        try { out[tpl.id] = await renderThumbnail(withTemplate(project, tpl.id), 180); } catch { /* thumbnail optional */ }
      }
      if (alive) setThumbs(out);
    }, 600);
    return () => { alive = false; clearTimeout(t); };
  }, [project]);
  return (
    <Section title="Templates">
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => {
          const active = project.templateId === t.id;
          return (
            <button key={t.id} type="button" onClick={() => set((p) => withTemplate(p, t.id))} aria-pressed={active}
              className={`overflow-hidden rounded-lg border-2 text-left transition ${active ? "border-primary" : "border-border hover:border-muted-foreground"}`}>
              <div className="flex aspect-[4/5] items-center justify-center bg-stage">
                {thumbs[t.id] ? <img src={thumbs[t.id]} alt={`${t.name} preview`} className="max-h-full max-w-full object-contain" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="p-2"><div className="text-xs font-bold">{t.name}</div><div className="line-clamp-2 text-[10px] text-muted-foreground">{t.description}</div></div>
            </button>
          );
        })}
      </div>
      <button className="btn w-full" onClick={() => confirm("Reset this template's layers to their defaults?") && set((p) => ({ ...p, layersByTemplate: { ...p.layersByTemplate, [p.templateId]: getTemplate(p.templateId).build(p.canvas) } }))}>
        <RotateCcw className="h-3.5 w-3.5" />Reset layout
      </button>
    </Section>
  );
}

export function PaletteSection({ project, set, palettes }: { project: Project; set: Setter; palettes: NamedPalette[] }) {
  const list = palettes.length ? palettes : buildPalettes([]);
  return (
    <Section title="Smart palette" right={<button className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => set((p) => ({ ...p, palette: { ...DEFAULT_PALETTE }, paletteName: "Cinema Gold" }))}>Reset</button>}>
      <div className="grid grid-cols-2 gap-2">
        {list.map((np) => (
          <button key={np.name} type="button" onClick={() => set((p) => ({ ...p, palette: { ...np.palette }, paletteName: np.name }))}
            className={`rounded-lg border-2 p-2 text-left ${project.paletteName === np.name ? "border-primary" : "border-border hover:border-muted-foreground"}`}>
            <div className="mb-1.5 flex h-5 overflow-hidden rounded">
              {Object.values(np.palette).map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
            </div>
            <span className="text-[11px] font-semibold">{np.name}</span>
          </button>
        ))}
      </div>
      {(["bg", "surface", "accent", "text", "muted"] as const).map((k) => (
        <label key={k} className="flex items-center justify-between text-xs">
          <span className="capitalize text-muted-foreground">{k === "bg" ? "Background" : k === "muted" ? "Secondary text" : k}</span>
          <input type="color" value={project.palette[k]} onChange={(e) => set((p) => ({ ...p, palette: { ...p.palette, [k]: e.target.value }, paletteName: "Custom" }))}
            className="h-7 w-12 cursor-pointer rounded border border-input bg-transparent" aria-label={`${k} colour`} />
        </label>
      ))}
    </Section>
  );
}

export function LayersSection({ project, set, selectedId, onSelect }: { project: Project; set: Setter; selectedId: string | null; onSelect(id: string | null): void }) {
  const layers = getLayers(project);
  const setLayers = (fn: (l: Layer[]) => Layer[]) => set((p) => ({ ...p, layersByTemplate: { ...p.layersByTemplate, [p.templateId]: fn(getLayers(p)) } }));
  const patch = (id: string, pt: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...pt } : l)));
  const moveBy = (id: string, d: number) => setLayers((ls) => {
    const i = ls.findIndex((l) => l.id === id), j = i + d;
    if (i < 0 || j < 0 || j >= ls.length) return ls;
    const c = [...ls]; [c[i], c[j]] = [c[j]!, c[i]!]; return c;
  });
  const add = (kind: "text" | "rect") => {
    const l: Layer = kind === "text"
      ? mkText("Custom text", "Your text", { x: 0.1, y: 0.1, w: 0.6, h: 0.08, size: 0.04, weight: 700 })
      : { id: uid(), name: "Shape", kind: "rect", x: 0.1, y: 0.1, w: 0.3, h: 0.05, rotation: 0, opacity: 1, visible: true, locked: false, removable: true, fill: "@accent", radius: 0.01, gradAngle: 90 };
    if (!l.defaults) { const { id: _i, ...snap } = l; l.defaults = JSON.parse(JSON.stringify(snap)); }
    setLayers((ls) => [...ls, l]); onSelect(l.id);
  };
  return (
    <Section title="Layers" right={<div className="flex gap-1">
      <button className="btn btn-ghost btn-icon" title="Add text" aria-label="Add text layer" onClick={() => add("text")}><Type className="h-4 w-4" /></button>
      <button className="btn btn-ghost btn-icon" title="Add shape" aria-label="Add shape layer" onClick={() => add("rect")}><Square className="h-4 w-4" /></button>
    </div>}>
      <ul className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
        {[...layers].reverse().map((l) => {
          const empty = l.visible && !isDrawable(l, project.meta);
          return (
            <li key={l.id} className={`group flex items-center gap-1 rounded-md px-1.5 py-1 text-xs ${selectedId === l.id ? "bg-accent ring-1 ring-primary/60" : "hover:bg-muted"}`}>
              <button className="min-w-0 flex-1 truncate text-left" onClick={() => onSelect(l.id)}>
                <span className={l.visible ? "" : "text-muted-foreground line-through"}>{l.name}</span>
                {empty && <span className="ml-1 text-[10px] text-muted-foreground">(no data)</span>}
              </button>
              <button className="btn-ghost rounded p-0.5" aria-label={l.visible ? "Hide" : "Show"} onClick={() => patch(l.id, { visible: !l.visible })}>{l.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}</button>
              <button className="btn-ghost rounded p-0.5" aria-label={l.locked ? "Unlock" : "Lock"} onClick={() => patch(l.id, { locked: !l.locked })}>{l.locked ? <Lock className="h-3.5 w-3.5 text-destructive" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}</button>
              <button className="btn-ghost rounded p-0.5" aria-label="Bring forward" onClick={() => moveBy(l.id, 1)}><ArrowUp className="h-3.5 w-3.5" /></button>
              <button className="btn-ghost rounded p-0.5" aria-label="Send backward" onClick={() => moveBy(l.id, -1)}><ArrowDown className="h-3.5 w-3.5" /></button>
            </li>
          );
        })}
      </ul>
      {selectedId && (() => {
        const l = layers.find((x) => x.id === selectedId);
        if (!l) return null;
        return (
          <div className="flex flex-wrap gap-1.5">
            {l.kind !== "image" && <button className="btn" onClick={() => { const d = duplicateLayer(l); setLayers((ls) => [...ls, d]); onSelect(d.id); }}><Copy className="h-3.5 w-3.5" />Duplicate</button>}
            <button className="btn" onClick={() => l.defaults && patch(l.id, { x: l.defaults.x ?? l.x, y: l.defaults.y ?? l.y, w: l.defaults.w ?? l.w, h: l.defaults.h ?? l.h, rotation: 0 })}><RotateCcw className="h-3.5 w-3.5" />Reset position</button>
            {l.removable && <button className="btn btn-danger" onClick={() => { setLayers((ls) => ls.filter((x) => x.id !== l.id)); onSelect(null); }}><Trash2 className="h-3.5 w-3.5" />Delete</button>}
          </div>
        );
      })()}
    </Section>
  );
}

const FONTS = ["Bebas Neue", "Oswald", "Sora", "Manrope", "Cinzel", "Playfair Display", "Noto Sans", "Noto Serif JP", "Noto Sans JP", "Noto Sans Tamil"];
const TYPO_KEYS: (keyof Layer)[] = ["font", "size", "weight", "italic", "color", "align", "letterSpacing", "lineHeight", "wrap", "uppercase", "shadow", "shadowColor", "outline", "outlineColor", "glow", "glowColor", "gradientTo", "highlight", "opacity", "rotation"];

export function InspectorSection({ project, set, selectedId, checkpoint }: { project: Project; set: Setter; selectedId: string | null; checkpoint(): void }) {
  const l = getLayers(project).find((x) => x.id === selectedId);
  if (!l) return <Section title="Properties"><p className="text-xs text-muted-foreground">Select a layer on the poster or in the layer list.</p></Section>;
  const patch = (pt: Partial<Layer>, transient = false) =>
    set((p) => ({ ...p, layersByTemplate: { ...p.layersByTemplate, [p.templateId]: getLayers(p).map((x) => (x.id === l.id ? { ...x, ...pt } : x)) } }), transient);
  const live = (k: keyof Layer) => (v: number) => patch({ [k]: v } as Partial<Layer>, true);
  const pal = project.palette;
  return (
    <>
      <Section title={`Properties · ${l.name}`}>
        <input className="field" value={l.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Layer name" />
        <div className="grid grid-cols-2 gap-x-3">
          <Slider label="X" value={l.x} min={-0.5} max={1} onChange={live("x")} onCommit={checkpoint} fmt={pct} />
          <Slider label="Y" value={l.y} min={-0.5} max={1} onChange={live("y")} onCommit={checkpoint} fmt={pct} />
          <Slider label="Width" value={l.w} min={0.02} max={1.5} onChange={live("w")} onCommit={checkpoint} fmt={pct} />
          <Slider label="Height" value={l.h} min={0.005} max={1.5} step={0.005} onChange={live("h")} onCommit={checkpoint} fmt={pct} />
          <Slider label="Rotation" value={l.rotation} min={-180} max={180} step={1} onChange={live("rotation")} onCommit={checkpoint} fmt={(v) => `${v}°`} />
          <Slider label="Opacity" value={l.opacity} min={0} max={1} onChange={live("opacity")} onCommit={checkpoint} fmt={pct} />
        </div>
      </Section>

      {l.kind === "image" && (
        <Section title="Image">
          <div className="flex gap-1.5">
            {(["cover", "contain"] as const).map((f) => <button key={f} className={`btn flex-1 ${l.fit === f ? "btn-primary" : ""}`} onClick={() => patch({ fit: f })}>{f === "cover" ? "Fill (crop)" : "Fit whole"}</button>)}
          </div>
          <Slider label="Zoom" value={l.zoom ?? 1} min={0.3} max={4} onChange={live("zoom")} onCommit={checkpoint} fmt={(v) => `${v.toFixed(2)}×`} />
          <Slider label="Pan X" value={l.offsetX ?? 0} min={-1} max={1} onChange={live("offsetX")} onCommit={checkpoint} fmt={pct} />
          <Slider label="Pan Y" value={l.offsetY ?? 0} min={-1} max={1} onChange={live("offsetY")} onCommit={checkpoint} fmt={pct} />
          <Slider label="Blur" value={l.blur ?? 0} min={0} max={60} step={1} onChange={live("blur")} onCommit={checkpoint} />
          <Slider label="Corner radius" value={l.radius ?? 0} min={0} max={0.1} step={0.002} onChange={live("radius")} onCommit={checkpoint} fmt={pct} />
        </Section>
      )}

      {l.kind === "rect" && (
        <Section title="Shape">
          <ColorField label="Fill" value={l.fill} palette={pal} onChange={(v) => patch({ fill: v ?? "@surface" })} />
          <ColorField label="Gradient to" value={l.gradTo} palette={pal} allowNone onChange={(v) => patch({ gradTo: v })} />
          {l.gradTo && <Slider label="Gradient angle" value={l.gradAngle ?? 90} min={0} max={360} step={1} onChange={live("gradAngle")} onCommit={checkpoint} fmt={(v) => `${v}°`} />}
          <ColorField label="Border" value={l.stroke} palette={pal} allowNone onChange={(v) => patch({ stroke: v, strokeWidth: v ? l.strokeWidth || 0.002 : 0 })} />
          <Slider label="Corner radius" value={l.radius ?? 0} min={0} max={0.1} step={0.002} onChange={live("radius")} onCommit={checkpoint} fmt={pct} />
        </Section>
      )}

      {l.kind === "text" && (
        <Section title="Typography" right={<button className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => { const d = l.defaults ?? {}; const pt: Partial<Layer> = {}; for (const k of TYPO_KEYS) (pt as Record<string, unknown>)[k] = (d as Record<string, unknown>)[k]; patch(pt); }}>Reset</button>}>
          <label className="block">
            <span className="label-sm">Text</span>
            <textarea className="field min-h-16" value={l.text ?? ""} onChange={(e) => patch({ text: e.target.value })} />
            <span className="mt-1 block text-[10px] text-muted-foreground">Use {"{title}"}, {"{year}"}, {"{genres}"}… to link metadata. Tamil, English & Japanese supported.</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label><span className="label-sm">Font</span>
              <select className="field" value={l.font} onChange={(e) => patch({ font: e.target.value })}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>
            <label><span className="label-sm">Weight</span>
              <select className="field" value={l.weight} onChange={(e) => patch({ weight: +e.target.value })}>{[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w}>{w}</option>)}</select></label>
          </div>
          <Slider label="Size" value={l.size ?? 0.03} min={0.006} max={0.2} step={0.001} onChange={live("size")} onCommit={checkpoint} fmt={(v) => (v * 100).toFixed(1)} />
          <div className="flex flex-wrap gap-1.5">
            {(["left", "center", "right"] as const).map((a) => <button key={a} className={`btn flex-1 capitalize ${l.align === a ? "btn-primary" : ""}`} onClick={() => patch({ align: a })}>{a}</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button className={`btn flex-1 ${l.wrap !== false ? "btn-primary" : ""}`} onClick={() => patch({ wrap: l.wrap === false })}>Wrap</button>
            <button className={`btn flex-1 ${l.uppercase ? "btn-primary" : ""}`} onClick={() => patch({ uppercase: !l.uppercase })}>CAPS</button>
            <button className={`btn flex-1 italic ${l.italic ? "btn-primary" : ""}`} onClick={() => patch({ italic: !l.italic })}>Italic</button>
          </div>
          <div className="grid grid-cols-2 gap-x-3">
            <Slider label="Letter spacing" value={l.letterSpacing ?? 0} min={-0.1} max={0.5} step={0.005} onChange={live("letterSpacing")} onCommit={checkpoint} fmt={(v) => v.toFixed(2)} />
            <Slider label="Line height" value={l.lineHeight ?? 1.2} min={0.7} max={2.2} onChange={live("lineHeight")} onCommit={checkpoint} fmt={(v) => v.toFixed(2)} />
            <Slider label="Shadow" value={l.shadow ?? 0} min={0} max={2} onChange={live("shadow")} onCommit={checkpoint} fmt={(v) => v.toFixed(1)} />
            <Slider label="Outline" value={l.outline ?? 0} min={0} max={2} onChange={live("outline")} onCommit={checkpoint} fmt={(v) => v.toFixed(1)} />
            <Slider label="Glow" value={l.glow ?? 0} min={0} max={2} onChange={live("glow")} onCommit={checkpoint} fmt={(v) => v.toFixed(1)} />
          </div>
          <ColorField label="Text colour" value={l.color} palette={pal} onChange={(v) => patch({ color: v ?? "@text" })} />
          <ColorField label="Gradient to" value={l.gradientTo} palette={pal} allowNone onChange={(v) => patch({ gradientTo: v })} />
          <ColorField label="Highlight behind text" value={l.highlight} palette={pal} allowNone onChange={(v) => patch({ highlight: v })} />
          {(l.outline ?? 0) > 0 && <ColorField label="Outline colour" value={l.outlineColor} palette={pal} onChange={(v) => patch({ outlineColor: v ?? "#000000" })} />}
          {(l.glow ?? 0) > 0 && <ColorField label="Glow colour" value={l.glowColor} palette={pal} onChange={(v) => patch({ glowColor: v ?? "@accent" })} />}
          {(l.shadow ?? 0) > 0 && <ColorField label="Shadow colour" value={l.shadowColor} palette={pal} onChange={(v) => patch({ shadowColor: v ?? "#000000" })} />}
        </Section>
      )}
    </>
  );
}

const EXPORT_PRESETS = [
  { label: "1080p landscape", w: 1920, h: 1080 },
  { label: "1080p portrait", w: 1080, h: 1920 },
  { label: "4K landscape", w: 3840, h: 2160 },
  { label: "4K portrait", w: 2160, h: 3840 },
  { label: "Poster 2:3 high-res", w: 3000, h: 4500 },
  { label: "Square 4K", w: 3840, h: 3840 },
];

export function ExportSection({ project, set }: { project: Project; set: Setter }) {
  const ep = project.exportPrefs;
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "ok" | "err"; msg?: string }>({ kind: "idle" });
  const up = (pt: Partial<typeof ep>) => set((p) => ({ ...p, exportPrefs: { ...p.exportPrefs, ...pt } }));
  const ca = project.canvas.w / project.canvas.h, ea = ep.w / ep.h;
  const mismatch = Math.abs(ca - ea) > 0.01;
  const run = async () => {
    setStatus({ kind: "busy", msg: `Rendering ${ep.w}×${ep.h}…` });
    try {
      const blob = await exportPoster(project, ep.w, ep.h, ep.format, ep.quality, ep.transparent);
      downloadBlob(blob, fileName(project, ep.format, ep.w, ep.h));
      setStatus({ kind: "ok", msg: `Downloaded ${ep.w}×${ep.h} ${ep.format.toUpperCase()} (${(blob.size / 1048576).toFixed(1)} MB)` });
    } catch (e) { setStatus({ kind: "err", msg: (e as Error).message }); }
  };
  return (
    <Section title="Export">
      <div className="flex gap-1.5">
        {(["png", "jpeg", "webp"] as ExportFormat[]).map((f) => <button key={f} className={`btn flex-1 uppercase ${ep.format === f ? "btn-primary" : ""}`} onClick={() => up({ format: f })}>{f === "jpeg" ? "JPG" : f}</button>)}
      </div>
      <label className="block"><span className="label-sm">Size preset</span>
        <select className="field" value={`${ep.w}x${ep.h}`} onChange={(e) => { const [w, h] = e.target.value.split("x").map(Number); if (w && h) up({ w, h }); }}>
          {!EXPORT_PRESETS.some((p) => p.w === ep.w && p.h === ep.h) && <option value={`${ep.w}x${ep.h}`}>Custom {ep.w}×{ep.h}</option>}
          {EXPORT_PRESETS.map((p) => <option key={p.label} value={`${p.w}x${p.h}`}>{p.label} — {p.w}×{p.h}{Math.abs(p.w / p.h - ca) < 0.01 ? " ✓" : ""}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label><span className="label-sm">Width</span><input type="number" className="field" min={64} max={8192} value={ep.w} onChange={(e) => up({ w: Math.round(+e.target.value) })} /></label>
        <label><span className="label-sm">Height</span><input type="number" className="field" min={64} max={8192} value={ep.h} onChange={(e) => up({ h: Math.round(+e.target.value) })} /></label>
      </div>
      <button className="btn w-full" onClick={() => up({ h: Math.round(ep.w / ca) })}>Match canvas shape</button>
      {mismatch && <p className="text-xs text-primary">This size has a different shape than the canvas — layout will be re-flowed. Use “Match canvas shape” to keep proportions.</p>}
      {ep.format !== "png" && <Slider label="Quality" value={ep.quality} min={0.5} max={1} onChange={(v) => up({ quality: v })} fmt={pct} />}
      {ep.format !== "jpeg" && (
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={ep.transparent} onChange={(e) => up({ transparent: e.target.checked })} className="accent-primary" />Transparent background (removes blurred background layer)</label>
      )}
      <button className="btn btn-primary w-full py-2.5" onClick={run} disabled={status.kind === "busy"}>
        {status.kind === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download poster
      </button>
      {status.msg && <p className={`text-xs ${status.kind === "err" ? "text-destructive" : status.kind === "ok" ? "text-success" : "text-muted-foreground"}`} role="status">{status.msg}</p>}
    </Section>
  );
}

export { Plus };
