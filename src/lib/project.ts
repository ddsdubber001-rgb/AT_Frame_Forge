import { DEFAULT_PALETTE } from "./palette";
import { getTemplate, uid } from "./templates";
import { emptyMeta, type Layer, type Project } from "./types";

export const CANVAS_PRESETS = [
  { id: "portrait", label: "Portrait 9:16", w: 1080, h: 1920 },
  { id: "poster", label: "Poster 2:3", w: 1200, h: 1800 },
  { id: "landscape", label: "Landscape 16:9", w: 1920, h: 1080 },
  { id: "square", label: "Square 1:1", w: 1440, h: 1440 },
] as const;

export function newProject(name = "Untitled poster"): Project {
  const canvas = { w: 1080, h: 1920 };
  const now = Date.now();
  return {
    id: uid(), name, createdAt: now, updatedAt: now, image: null, imageW: 0, imageH: 0,
    meta: emptyMeta(), templateId: "classic",
    layersByTemplate: { classic: getTemplate("classic").build(canvas) },
    palette: { ...DEFAULT_PALETTE }, paletteName: "Cinema Gold", canvas,
    exportPrefs: { format: "png", w: 2160, h: 3840, quality: 0.92, transparent: false },
  };
}

export function getLayers(p: Project): Layer[] {
  return p.layersByTemplate[p.templateId] ?? getTemplate(p.templateId).build(p.canvas);
}

export function withTemplate(p: Project, templateId: string): Project {
  const lbt = { ...p.layersByTemplate };
  if (!lbt[templateId]) lbt[templateId] = getTemplate(templateId).build(p.canvas);
  return { ...p, templateId, layersByTemplate: lbt };
}

export function withCanvas(p: Project, w: number, h: number): Project {
  const portrait = h >= w;
  return {
    ...p, canvas: { w, h },
    layersByTemplate: { [p.templateId]: getTemplate(p.templateId).build({ w, h }) },
    exportPrefs: { ...p.exportPrefs, w: portrait ? Math.round((3840 * w) / h) : 3840, h: portrait ? 3840 : Math.round((3840 * h) / w) },
  };
}

export function duplicateLayer(l: Layer): Layer {
  return { ...JSON.parse(JSON.stringify(l)), id: uid(), name: `${l.name} copy`, x: Math.min(0.95, l.x + 0.02), y: Math.min(0.95, l.y + 0.02), removable: true };
}
