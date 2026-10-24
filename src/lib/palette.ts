import type { Palette } from "./types";

export const DEFAULT_PALETTE: Palette = {
  bg: "#07090f", surface: "#121826", accent: "#f2b544", text: "#ffffff", muted: "#c4cad6",
};

type RGB = [number, number, number];
export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]: RGB) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function rgbToHsl([r, g, b]: RGB): RGB {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}
function hslToHex(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return rgbToHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return rgbToHex([f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]);
}
export function luminance(hex: string) {
  const c = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
const readableOn = (bg: string) => (contrast("#ffffff", bg) >= contrast("#0a0a0a", bg) ? "#ffffff" : "#0a0a0a");

/** Dominant colours from the artwork via coarse histogram quantisation. */
export function extractColors(img: CanvasImageSource & { width: number; height: number }): string[] {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 64, 64);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!;
    const k = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; buckets.set(k, e);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n] as RGB);
  const out: RGB[] = [];
  for (const col of sorted) {
    if (out.every((o) => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) > 56)) out.push(col);
    if (out.length >= 6) break;
  }
  return out.map(rgbToHex);
}

export interface NamedPalette { name: string; palette: Palette }

export function buildPalettes(colors: string[]): NamedPalette[] {
  const base: NamedPalette[] = [
    { name: "Cinema Gold", palette: DEFAULT_PALETTE },
    { name: "Ice Steel", palette: { bg: "#05080d", surface: "#0f1724", accent: "#7cc4ff", text: "#ffffff", muted: "#b7c3d4" } },
  ];
  if (!colors.length) return base;
  const hsl = colors.map((c) => ({ c, hsl: rgbToHsl(hexToRgb(c)) }));
  const dom = hsl[0]!;
  const vivid = [...hsl].sort((a, b) => b.hsl[1] * (1 - Math.abs(b.hsl[2] - 0.5)) - a.hsl[1] * (1 - Math.abs(a.hsl[2] - 0.5)))[0]!;
  const vh = vivid.hsl[0];
  const darkBg = hslToHex(dom.hsl[0], Math.min(0.45, dom.hsl[1]), 0.06);
  const accentVivid = hslToHex(vh, Math.max(0.65, vivid.hsl[1]), 0.6);
  const comp = hslToHex(vh + 180, 0.7, 0.62);
  const mk = (name: string, bg: string, accent: string, surfaceL: number, hue: number): NamedPalette => {
    const text = readableOn(bg);
    return {
      name,
      palette: { bg, surface: hslToHex(hue, 0.25, surfaceL), accent, text, muted: text === "#ffffff" ? "#c9ced8" : "#3a3f48" },
    };
  };
  return [
    mk("Artwork Dark", darkBg, accentVivid, 0.12, dom.hsl[0]),
    mk("Artwork Vibrant", hslToHex(vh, 0.55, 0.08), comp, 0.14, vh),
    mk("Neutral", "#0b0b0c", hslToHex(vh, 0.25, 0.78), 0.11, vh),
    mk("Light Poster", hslToHex(dom.hsl[0], 0.25, 0.93), hslToHex(vh, 0.7, 0.42), 0.86, dom.hsl[0]),
    ...base,
  ];
}
