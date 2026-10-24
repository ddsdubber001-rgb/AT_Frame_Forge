import { useEffect, useRef, useState } from "react";
import { ensureFonts, hitTest, renderPoster } from "@/lib/renderer";
import type { Layer, Project } from "@/lib/types";

interface Props {
  project: Project; layers: Layer[]; art: HTMLImageElement | null; selectedId: string | null;
  onSelect(id: string | null): void;
  onChange(id: string, patch: Partial<Layer>, transient: boolean): void;
  onCheckpoint(): void;
}

export function PosterCanvas({ project, layers, art, selectedId, onSelect, onChange, onCheckpoint }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [fontTick, setFontTick] = useState(0);
  const drag = useRef<{ id: string; mode: "move" | "resize"; sx: number; sy: number; l: Layer } | null>(null);
  const aspect = project.canvas.w / project.canvas.h;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth - 16, ch = el.clientHeight - 16;
      const w = Math.max(100, Math.min(cw, ch * aspect));
      setSize({ w: Math.floor(w), h: Math.floor(w / aspect) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  useEffect(() => {
    let alive = true;
    ensureFonts(layers, project.meta).then(() => alive && setFontTick((t) => t + 1));
    return () => { alive = false; };
  }, [layers, project.meta]);

  useEffect(() => {
    const c = cv.current;
    if (!c || !size.w) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderPoster(ctx, size.w, size.h, layers, project.meta, project.palette, art);
    const sel = layers.find((l) => l.id === selectedId);
    if (sel) { // editor-only overlay, never part of export
      const x = sel.x * size.w, y = sel.y * size.h, w = sel.w * size.w, h = sel.h * size.h;
      ctx.save();
      ctx.strokeStyle = sel.locked ? "#ff6b6b" : "#f2b544";
      ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      if (!sel.locked) { ctx.fillStyle = "#f2b544"; ctx.fillRect(x + w - 6, y + h - 6, 12, 12); }
      ctx.restore();
    }
  }, [size, layers, project.meta, project.palette, art, selectedId, fontTick]);

  const norm = (e: React.PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, px: e.clientX - r.left, py: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    const p = norm(e);
    const sel = layers.find((l) => l.id === selectedId);
    if (sel && !sel.locked && Math.abs(p.px - (sel.x + sel.w) * size.w) < 14 && Math.abs(p.py - (sel.y + sel.h) * size.h) < 14) {
      onCheckpoint();
      drag.current = { id: sel.id, mode: "resize", sx: p.x, sy: p.y, l: sel };
    } else {
      const hit = hitTest(layers, project.meta, p.x, p.y);
      onSelect(hit?.id ?? null);
      if (hit && !hit.locked) { onCheckpoint(); drag.current = { id: hit.id, mode: "move", sx: p.x, sy: p.y, l: hit }; }
    }
    if (drag.current) (e.target as Element).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = norm(e);
    const dx = p.x - d.sx, dy = p.y - d.sy;
    if (d.mode === "move") onChange(d.id, { x: +(d.l.x + dx).toFixed(4), y: +(d.l.y + dy).toFixed(4) }, true);
    else onChange(d.id, { w: Math.max(0.02, +(d.l.w + dx).toFixed(4)), h: Math.max(0.01, +(d.l.h + dy).toFixed(4)) }, true);
  };
  const up = () => { drag.current = null; };

  return (
    <div ref={wrap} className="checker flex h-full w-full items-center justify-center overflow-hidden rounded-xl">
      <canvas
        ref={cv}
        style={{ width: size.w, height: size.h, touchAction: "none" }}
        className="rounded-md shadow-2xl"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        aria-label="Poster preview — click a layer to select, drag to move, drag the corner square to resize"
      />
    </div>
  );
}
