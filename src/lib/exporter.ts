import { ensureFonts, renderPoster } from "./renderer";
import { getLayers } from "./project";
import type { ExportFormat, Project } from "./types";

const cache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Image could not be loaded"));
      i.src = src;
    });
    cache.set(src, p);
    p.catch(() => cache.delete(src));
  }
  return p;
}

async function renderCanvas(project: Project, w: number, h: number, transparent = false) {
  const layers = getLayers(project);
  const art = project.image ? await loadImage(project.image) : null;
  await ensureFonts(layers, project.meta);
  const c = document.createElement("canvas");
  c.width = Math.round(w); c.height = Math.round(h);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");
  // Contain the exact preview composition when export and canvas aspects differ.
  const scale = Math.min(c.width/project.canvas.w,c.height/project.canvas.h);
  ctx.fillStyle=project.palette.bg;
  if(!transparent) ctx.fillRect(0,0,c.width,c.height);
  ctx.translate((c.width-project.canvas.w*scale)/2,(c.height-project.canvas.h*scale)/2);
  ctx.scale(scale,scale);
  renderPoster(ctx, project.canvas.w, project.canvas.h, layers, project.meta, project.palette, art, { transparent });
  return c;
}

export async function exportPoster(project: Project, w: number, h: number, format: ExportFormat, quality = 0.92, transparent = false): Promise<Blob> {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 64 || h < 64 || w > 8192 || h > 8192) throw new Error("Size must be whole pixels between 64 and 8192 px");
  const c = await renderCanvas(project, w, h, transparent && format !== "jpeg");
  const type = `image/${format}`;
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, quality));
  if (!blob) throw new Error("Rendering failed — the size may be too large for this device");
  if (blob.type !== type) throw new Error(`This browser cannot encode ${format.toUpperCase()}. Try PNG or JPG.`);
  return blob;
}

export async function renderThumbnail(project: Project, width = 320) {
  const h = Math.round((width * project.canvas.h) / project.canvas.w);
  const c = await renderCanvas(project, width, h);
  return c.toDataURL("image/jpeg", 0.75);
}

export function fileName(project: Project, format: ExportFormat, w: number, h: number) {
  const base = (project.meta.title || project.name || "poster").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60) || "poster";
  return `${base}-${w}x${h}.${format === "jpeg" ? "jpg" : format}`;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
