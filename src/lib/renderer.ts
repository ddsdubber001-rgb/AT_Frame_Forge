import type { Layer, Meta, Palette } from "./types";
import { loadLogo } from './logo';
let logo: HTMLImageElement | null = null;

/** Single renderer used by the live preview, thumbnails, batch and final export. */

const TOKEN = /\{(\w+)\}/g;
const metaVal = (meta: Meta, k: string) => String((meta as unknown as Record<string, string>)[k] ?? "").trim();

/** Resolves {field} tokens. Returns null when every referenced field is empty (never invents data). */
export function resolveText(t: string, meta: Meta): string | null {
  const tokens = [...t.matchAll(TOKEN)].map((m) => m[1]!);
  if (!tokens.length) return t;
  if (!tokens.some((k) => metaVal(meta, k))) return null;
  const out = t.replace(TOKEN, (_, k: string) => metaVal(meta, k));
  return out.split(" · ").map((s) => s.trim()).filter(Boolean).join(" · ");
}

export function isDrawable(l: Layer, meta: Meta) {
  if (!l.visible) return false;
  if (l.dependsOn?.length && !l.dependsOn.some((f) => metaVal(meta, f))) return false;
  if (l.kind === "text") { const t = resolveText(l.text ?? "", meta); return !!t && t.trim().length > 0; }
  return true;
}

export function resolveColor(c: string | null | undefined, pal: Palette): string {
  if (!c) return "rgba(0,0,0,0)";
  const [b, a] = c.split("/");
  let hex = b!;
  if (hex.startsWith("@")) hex = (pal as unknown as Record<string, string>)[hex.slice(1)] ?? "#ffffff";
  if (a === undefined) return hex;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${parseFloat(a)})`;
}

const FALLBACKS = `"Noto Sans", "Noto Sans Tamil", "Noto Sans JP", sans-serif`;
export const fontString = (l: Layer, px: number) =>
  `${l.italic ? "italic " : ""}${l.weight ?? 400} ${px}px "${l.font ?? "Noto Sans"}", ${FALLBACKS}`;

export async function ensureFonts(layers: Layer[], meta: Meta) {
  if (typeof document === "undefined" || !document.fonts) return;
  logo = await loadLogo();
  const jobs: Promise<unknown>[] = [];
  for (const l of layers) {
    if (l.kind !== "text") continue;
    const t = (resolveText(l.text ?? "", meta) ?? "") || "A";
    const w = l.weight ?? 400;
    jobs.push(
      document.fonts.load(`${l.italic ? "italic " : ""}${w} 40px "${l.font ?? "Noto Sans"}"`, t),
      document.fonts.load(`${w} 40px "Noto Sans"`, t),
      document.fonts.load(`${w} 40px "Noto Sans Tamil"`, t),
      document.fonts.load(`${w} 40px "Noto Sans JP"`, t),
    );
  }
  await Promise.allSettled(jobs);
}

let segmenter: { segment(s: string): Iterable<{ segment: string }> } | null = null;
function graphemes(s: string): string[] {
  if (!segmenter && typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const S = (Intl as unknown as { Segmenter: new (l?: string, o?: object) => typeof segmenter }).Segmenter;
    segmenter = new S(undefined, { granularity: "grapheme" });
  }
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  const fits = (s: string) => ctx.measureText(s).width <= maxW;
  for (const para of text.split("\n")) {
    let line = "";
    for (const tok of para.split(/(\s+)/)) {
      if (!tok) continue;
      if (fits(line + tok)) { line += tok; continue; }
      if (line.trim()) { lines.push(line.trimEnd()); line = ""; }
      if (/^\s+$/.test(tok)) continue;
      if (fits(tok)) { line = tok; continue; }
      for (const g of graphemes(tok)) { // break long words / CJK by grapheme, keeps Tamil clusters intact
        if (!fits(line + g) && line) { lines.push(line); line = g; } else line += g;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function ellipsize(ctx: CanvasRenderingContext2D, s: string, maxW: number) {
  if (ctx.measureText(s).width <= maxW) return s;
  const g = graphemes(s);
  while (g.length && ctx.measureText(g.join("") + "…").width > maxW) g.pop();
  return g.join("").trimEnd() + "…";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const blurCache = new WeakMap<object, Map<number, HTMLCanvasElement>>();
function blurred(art: HTMLImageElement, amount: number): CanvasImageSource {
  if (amount <= 0) return art;
  let m = blurCache.get(art);
  if (!m) { m = new Map(); blurCache.set(art, m); }
  const key = Math.round(amount);
  const hit = m.get(key);
  if (hit) return hit;
  const scale = Math.max(1, key / 2);
  const small = document.createElement("canvas");
  small.width = Math.max(4, Math.round(art.naturalWidth / scale / 4));
  small.height = Math.max(4, Math.round(art.naturalHeight / scale / 4));
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(art, 0, 0, small.width, small.height);
  const mid = document.createElement("canvas");
  mid.width = Math.min(800, art.naturalWidth); mid.height = Math.round(mid.width * art.naturalHeight / art.naturalWidth);
  const mctx = mid.getContext("2d")!;
  mctx.imageSmoothingQuality = "high";
  mctx.drawImage(small, 0, 0, mid.width, mid.height);
  m.set(key, mid);
  return mid;
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  const c = ctx as unknown as { letterSpacing?: string };
  if ("letterSpacing" in ctx) c.letterSpacing = `${px}px`;
}

export interface RenderOpts { transparent?: boolean }

export function renderPoster(
  ctx: CanvasRenderingContext2D, W: number, H: number, layers: Layer[], meta: Meta, pal: Palette,
  art: HTMLImageElement | null, opts: RenderOpts = {},
) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (!opts.transparent) { ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H); }
  for (const l of layers) {
    if (!isDrawable(l, meta)) continue;
    if (opts.transparent && l.role === "background") continue;
    const bx = l.x * W, by = l.y * H, bw = l.w * W, bh = l.h * H;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, l.opacity));
    if (l.rotation) {
      ctx.translate(bx + bw / 2, by + bh / 2);
      ctx.rotate((l.rotation * Math.PI) / 180);
      ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    }
    if (l.kind === "image") drawImageLayer(ctx, l, bx, by, bw, bh, H, l.role === 'logo' ? logo : art, pal);
    else if (l.kind === "rect") drawRect(ctx, l, bx, by, bw, bh, H, pal);
    else drawText(ctx, l, bx, by, bw, bh, H, resolveText(l.text ?? "", meta) ?? "", pal);
    ctx.restore();
  }
  ctx.restore();
}

function drawImageLayer(ctx: CanvasRenderingContext2D, l: Layer, x: number, y: number, w: number, h: number, H: number, art: HTMLImageElement | null, pal: Palette) {
  if (l.role === 'logo') {
    const d = Math.min(w,h);
    ctx.beginPath(); ctx.arc(x+d/2,y+d/2,d/2,0,Math.PI*2); ctx.clip();
    ctx.fillStyle = pal.text; ctx.fillRect(x,y,d,d);
    if (art) ctx.drawImage(art,x+d*0.1,y+d*0.1,d*0.8,d*0.8);
    return;
  }
  roundRect(ctx, x, y, w, h, (l.radius ?? 0) * H);
  ctx.clip();
  if (!art) { ctx.fillStyle = pal.surface; ctx.fillRect(x, y, w, h); return; }
  const iw = art.naturalWidth, ih = art.naturalHeight;
  const z = l.zoom ?? 1;
  const s = (l.fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih)) * z;
  const dw = iw * s, dh = ih * s;
  const dx = x + (w - dw) / 2 + (l.offsetX ?? 0) * w, dy = y + (h - dh) / 2 + (l.offsetY ?? 0) * h;
  ctx.drawImage(blurred(art, l.blur ?? 0), dx, dy, dw, dh);
}

function drawRect(ctx: CanvasRenderingContext2D, l: Layer, x: number, y: number, w: number, h: number, H: number, pal: Palette) {
  roundRect(ctx, x, y, w, h, (l.radius ?? 0) * H);
  if (l.gradTo) {
    const a = ((l.gradAngle ?? 90) * Math.PI) / 180, cx = x + w / 2, cy = y + h / 2;
    const dx = (Math.cos(a) * w) / 2, dy = (Math.sin(a) * h) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, resolveColor(l.fill, pal));
    g.addColorStop(1, resolveColor(l.gradTo, pal));
    ctx.fillStyle = g;
  } else ctx.fillStyle = resolveColor(l.fill, pal);
  ctx.fill();
  if (l.stroke && (l.strokeWidth ?? 0) > 0) {
    ctx.strokeStyle = resolveColor(l.stroke, pal);
    ctx.lineWidth = (l.strokeWidth ?? 0) * H;
    ctx.stroke();
  }
}

function drawText(ctx: CanvasRenderingContext2D, l: Layer, x: number, y: number, w: number, h: number, H: number, raw: string, pal: Palette) {
  if (l.role === 'genre-tags') {
    const px = Math.max(1,(l.size ?? 0.025)*H); ctx.font=fontString(l,px); setLetterSpacing(ctx,0);
    let tx=x, ty=y;
    for (const tag of raw.split(',').map(t=>t.trim()).filter(Boolean)) {
      const tw = Math.min(w,ctx.measureText(tag).width+px*1.3), th=px*1.65;
      if(tx+tw>x+w){tx=x;ty+=th+px*0.25;} if(ty+th>y+h) break;
      ctx.fillStyle=resolveColor(l.highlight,pal); roundRect(ctx,tx,ty,tw,th,th/2);ctx.fill();
      ctx.strokeStyle=resolveColor('@text/0.25',pal);ctx.lineWidth=Math.max(0.5,H*0.001);ctx.stroke();
      ctx.fillStyle=resolveColor(l.color,pal);ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(ellipsize(ctx,tag,tw-px*0.8),tx+px*0.5,ty+th/2);
      tx+=tw+px*0.4;
    }
    return;
  }
  let px = Math.max(1, (l.size ?? 0.03) * H);
  if(l.autoFit) {
    const minimum=px*0.35;
    while(px>minimum) {
      ctx.font=fontString(l,px); setLetterSpacing(ctx,(l.letterSpacing??0)*px);
      const lines=l.wrap===false?raw.split('\n'):wrapText(ctx,raw,w);
      if(lines.length*px*(l.lineHeight??1.2)<=h && lines.every(line=>ctx.measureText(line).width<=w)) break;
      px*=0.95;
    }
  }
  ctx.font = fontString(l, px);
  setLetterSpacing(ctx, (l.letterSpacing ?? 0) * px);
  const text = l.uppercase ? raw.toLocaleUpperCase() : raw;
  const lh = px * (l.lineHeight ?? 1.2);
  let lines = l.wrap === false ? text.split("\n").map((s) => ellipsize(ctx, s, w)) : wrapText(ctx, text, w);
  const max = Math.max(1, Math.floor((h + 0.5) / lh));
  if (lines.length > max) { lines = lines.slice(0, max); lines[max - 1] = ellipsize(ctx, lines[max - 1] + "…", w); }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = l.align ?? "left";
  const ax = l.align === "center" ? x + w / 2 : l.align === "right" ? x + w : x;
  const fill = resolveColor(l.color, pal);
  lines.forEach((line, i) => {
    const top = y + i * lh;
    const base = top + (lh - px) / 2 + px * 0.82;
    if (l.highlight) {
      const tw = ctx.measureText(line).width, pad = px * 0.4;
      const lx = l.align === "center" ? ax - tw / 2 : l.align === "right" ? ax - tw : ax;
      ctx.save();
      ctx.fillStyle = resolveColor(l.highlight, pal);
      roundRect(ctx, lx - pad, top + (lh - px * 1.35) / 2, tw + pad * 2, px * 1.35, px * 0.2);
      ctx.fill();
      ctx.restore();
    }
    let style: string | CanvasGradient = fill;
    if (l.gradientTo) {
      const g = ctx.createLinearGradient(0, base - px * 0.8, 0, base + px * 0.15);
      g.addColorStop(0, fill); g.addColorStop(1, resolveColor(l.gradientTo, pal));
      style = g;
    }
    if ((l.glow ?? 0) > 0) {
      ctx.save();
      ctx.shadowColor = resolveColor(l.glowColor ?? "@accent", pal);
      ctx.shadowBlur = (l.glow ?? 0) * px * 0.6;
      ctx.fillStyle = style;
      ctx.fillText(line, ax, base);
      ctx.restore();
    }
    ctx.save();
    if ((l.shadow ?? 0) > 0) {
      ctx.shadowColor = resolveColor(l.shadowColor ?? "#000000", pal);
      ctx.shadowBlur = (l.shadow ?? 0) * px * 0.35;
      ctx.shadowOffsetY = (l.shadow ?? 0) * px * 0.06;
    }
    if ((l.outline ?? 0) > 0) {
      ctx.lineJoin = "round";
      ctx.lineWidth = (l.outline ?? 0) * px * 0.12;
      ctx.strokeStyle = resolveColor(l.outlineColor ?? "#000000", pal);
      ctx.strokeText(line, ax, base);
      ctx.shadowColor = "transparent";
    }
    ctx.fillStyle = style;
    ctx.fillText(line, ax, base);
    ctx.restore();
  });
}

export function hitTest(layers: Layer[], meta: Meta, nx: number, ny: number): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]!;
    if (l.role === "background" || !isDrawable(l, meta)) continue;
    if (nx >= l.x && nx <= l.x + l.w && ny >= l.y && ny <= l.y + l.h) return l;
  }
  return null;
}
