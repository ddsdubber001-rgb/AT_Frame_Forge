import type { Layer, MetaField } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const base = (name: string, kind: Layer["kind"], p: Partial<Layer>): Layer => {
  const l: Layer = {
    id: uid(), name, kind, x: 0, y: 0, w: 1, h: 1, rotation: 0, opacity: 1,
    visible: true, locked: false, removable: true, ...p,
  };
  const { id: _i, defaults: _d, ...snap } = l;
  l.defaults = JSON.parse(JSON.stringify(snap));
  return l;
};
const img = (name: string, p: Partial<Layer>) => base(name, "image", { fit: "cover", zoom: 1, offsetX: 0, offsetY: 0, blur: 0, radius: 0, ...p });
const rect = (name: string, p: Partial<Layer>) => base(name, "rect", { fill: "@surface", gradTo: null, gradAngle: 90, radius: 0, stroke: null, strokeWidth: 0, ...p });
export const text = (name: string, t: string, p: Partial<Layer>) =>
  base(name, "text", {
    text: t, font: "Noto Sans", size: 0.03, weight: 400, color: "@text", align: "left", letterSpacing: 0,
    lineHeight: 1.2, wrap: true, uppercase: false, shadow: 0, shadowColor: "#000000", outline: 0,
    outlineColor: "#000000", glow: 0, glowColor: "@accent", gradientTo: null, highlight: null, ...p,
  });

export interface Canvas { w: number; h: number }
export interface TemplateDef { id: string; name: string; description: string; build(c: Canvas): Layer[] }

const classic: TemplateDef = {
  id: "classic",
  name: "Classic Cinematic",
  description: "Full-bleed artwork with gradient and stacked title block.",
  build({ w, h }) {
    const land = w > h;
    const X = land ? 0.05 : 0.06, W = land ? 0.55 : 0.88;
    const s = (p: number, l: number) => (land ? l : p);
    return [
      img("Artwork", { role: "artwork", removable: false }),
      rect("Bottom gradient", { role: "overlay", y: s(0.4, 0.3), h: s(0.6, 0.7), fill: "@bg/0", gradTo: "@bg/0.96", gradAngle: 90 }),
      rect("Top shade", { role: "overlay", h: 0.18, fill: "@bg/0.6", gradTo: "@bg/0", gradAngle: 90 }),
      ...(land ? [rect("Side shade", { role: "overlay", w: 0.7, fill: "@bg/0.85", gradTo: "@bg/0", gradAngle: 0 })] : []),
      text("Type badge", "{type}", { x: X, y: s(0.575, 0.34), w: 0.4, h: s(0.026, 0.05), size: s(0.016, 0.028), weight: 700, font: "Manrope", color: "@bg", highlight: "@accent", uppercase: true, letterSpacing: 0.14, wrap: false }),
      text("Main title", "{title}", { role: "title", x: X, y: s(0.605, 0.4), w: W, h: s(0.13, 0.2), size: s(0.072, 0.1), font: "Bebas Neue", lineHeight: 0.95, shadow: 0.6, shadowColor: "#000000" }),
      rect("Accent bar", { role: "accent", x: X, y: s(0.742, 0.61), w: 0.08, h: s(0.004, 0.006), fill: "@accent" }),
      text("Subtitle", "{altTitle}", { x: X, y: s(0.755, 0.63), w: W, h: s(0.03, 0.045), size: s(0.02, 0.03), italic: true, color: "@muted", wrap: false }),
      text("Info line", "{year} · {season} · {episodes} · {runtime} · {status} · {language} · {ageRating}", { x: X, y: s(0.79, 0.685), w: W, h: s(0.028, 0.04), size: s(0.0165, 0.025), weight: 600, font: "Manrope", wrap: false }),
      text("Genres", "{genres}", { x: X, y: s(0.823, 0.73), w: W, h: s(0.026, 0.04), size: s(0.015, 0.023), weight: 700, color: "@accent", uppercase: true, letterSpacing: 0.12, font: "Manrope", wrap: false }),
      text("Synopsis", "{synopsis}", { x: X, y: s(0.858, 0.78), w: s(0.88, 0.45), h: s(0.105, 0.17), size: s(0.0145, 0.022), color: "@muted", lineHeight: 1.4 }),
      text("Rating badge", "★ {rating}", { role: "rating", x: s(0.7, 0.8), y: 0.04, w: s(0.26, 0.16), h: s(0.034, 0.06), size: s(0.018, 0.03), weight: 700, font: "Manrope", color: "@bg", highlight: "@accent", align: "right", wrap: false }),
    ];
  },
};

const CARDS: [MetaField, string][] = [
  ["genres", "Genres"], ["releaseDate", "Release date"], ["status", "Status"], ["season", "Season"],
  ["runtime", "Runtime"], ["studio", "Studio"], ["episodes", "Episodes"], ["rating", "Rating"],
];

const split: TemplateDef = {
  id: "split",
  name: "Split Info Panel",
  description: "Framed poster beside a cinematic information panel on blurred artwork.",
  build({ w, h }) {
    const land = w > h;
    const L = land
      ? { frame: [0.055, 0.085, 0.29, 0.83], panel: [0.39, 0.085, 0.56, 0.83], tx: 0.425, tw: 0.5, ty: 0.12, th: 0.17, ts: 0.085, sub: 0.29, subS: 0.024, bar: 0.345, line: 0.365, lineS: 0.021, cy: 0.42, cw: 0.245, cg: 0.01, rh: 0.07, rg: 0.012, ls: 0.014, vs: 0.022, syn: [0.74, 0.15], synS: 0.019 }
      : { frame: [0.2, 0.04, 0.6, 0.4], panel: [0.05, 0.465, 0.9, 0.505], tx: 0.09, tw: 0.82, ty: 0.485, th: 0.085, ts: 0.05, sub: 0.572, subS: 0.016, bar: 0.605, line: 0.615, lineS: 0.0135, cy: 0.645, cw: 0.405, cg: 0.01, rh: 0.05, rg: 0.008, ls: 0.0105, vs: 0.0155, syn: [0.88, 0.075], synS: 0.0125 };
    const [fx, fy, fw, fh] = L.frame as [number, number, number, number];
    const [px, py, pw, ph] = L.panel as [number, number, number, number];
    const cards: Layer[] = [];
    CARDS.forEach(([field, label], i) => {
      const cx = L.tx + (i % 2) * (L.cw + L.cg), cy = L.cy + Math.floor(i / 2) * (L.rh + L.rg);
      const dep = [field];
      cards.push(
        rect(`${label} card`, { role: "card", x: cx, y: cy, w: L.cw, h: L.rh, fill: "@bg/0.5", stroke: "@accent/0.3", strokeWidth: 0.0015, radius: 0.008, dependsOn: dep }),
        text(`${label} label`, label, { role: "label", x: cx + 0.012, y: cy + L.rh * 0.1, w: L.cw - 0.024, h: L.rh * 0.36, size: L.ls, weight: 700, color: "@accent", uppercase: true, letterSpacing: 0.12, font: "Manrope", wrap: false, dependsOn: dep }),
        text(`${label} value`, `{${field}}`, { role: "value", x: cx + 0.012, y: cy + L.rh * 0.46, w: L.cw - 0.024, h: L.rh * 0.48, size: L.vs, weight: 600, font: "Manrope", wrap: false }),
      );
    });
    return [
      img("Blurred background", { role: "background", blur: 28, zoom: 1.1, removable: false }),
      rect("Readability gradient", { role: "overlay", fill: "@bg/0.55", gradTo: "@bg/0.92", gradAngle: land ? 0 : 90 }),
      rect("Poster frame", { x: fx - 0.006, y: fy - 0.006 * (w / h), w: fw + 0.012, h: fh + 0.012 * (w / h), fill: "@surface", radius: 0.014, stroke: "@accent/0.7", strokeWidth: 0.002 }),
      img("Poster artwork", { role: "artwork", x: fx, y: fy, w: fw, h: fh, radius: 0.01, removable: false }),
      rect("Info panel", { role: "panel", x: px, y: py, w: pw, h: ph, fill: "@surface/0.6", radius: 0.02, stroke: "@text/0.12", strokeWidth: 0.0015 }),
      text("Main title", "{title}", { role: "title", x: L.tx, y: L.ty, w: L.tw, h: L.th, size: L.ts, font: "Bebas Neue", lineHeight: 0.95 }),
      text("Subtitle", "{altTitle}", { x: L.tx, y: L.sub, w: L.tw, h: L.subS * 1.6, size: L.subS, italic: true, color: "@muted", wrap: false }),
      rect("Accent bar", { role: "accent", x: L.tx, y: L.bar, w: 0.06, h: land ? 0.006 : 0.003, fill: "@accent" }),
      text("Info line", "{type} · {year} · {language} · {ageRating}", { x: L.tx, y: L.line, w: L.tw, h: L.lineS * 1.6, size: L.lineS, weight: 600, font: "Manrope", uppercase: true, letterSpacing: 0.08, wrap: false }),
      ...cards,
      text("Synopsis", "{synopsis}", { x: L.tx, y: L.syn[0]!, w: L.tw, h: L.syn[1]!, size: L.synS, color: "@muted", lineHeight: 1.45 }),
    ];
  },
};

export function logoLayer({ w, h }: Canvas): Layer {
  const diameter = Math.min(w, h) * 0.09;
  return img('ANIME TAMILAN logo', { id: 'anime-tamilan-logo', role: 'logo', x: 1 - (diameter + Math.min(w,h) * 0.035) / w,
    y: Math.min(w,h) * 0.035 / h, w: diameter / w, h: diameter / h, radius: 1, removable: false, fit: 'contain' });
}

const cinematic: TemplateDef = {
  id: 'reference-cinematic', name: 'Design 1 — Reference Cinematic', description: 'Wide cinematic artwork, strong title, badges and rounded genre tags.',
  build({ w, h }) {
    const land = w > h, x = 0.06, width = land ? 0.82 : 0.88;
    const y = land ? 0.48 : 0.55, scale = land ? 1 : 0.55;
    return [
      img('Cinematic artwork', { role: 'artwork', removable: false, blur: 2 }),
      rect('Dark cinematic shade', { role: 'overlay', fill: '@bg/0.3', gradTo: '@bg/0.95', gradAngle: 90 }),
      rect('Text contrast', { role: 'overlay', w: 0.85, fill: '@bg/0.65', gradTo: '@bg/0', gradAngle: 0 }),
      text('Category', '{type}', { x, y, w: land ? 0.2 : 0.38, h: 0.055*scale, size: 0.025*scale, weight: 800, uppercase: true, highlight: '@accent', color: '@bg', wrap: false }),
      text('Status', '{status}', { x: land ? 0.29 : 0.5, y, w: land ? 0.24 : 0.4, h: 0.055*scale, size: 0.025*scale, weight: 700, highlight: '@surface', wrap: false }),
      text('Main title', '{title}', { role: 'title', x, y: y+0.065*scale, w: width, h: 0.17*scale, size: 0.115*scale, font: 'Bebas Neue', lineHeight: 1, autoFit: true }),
      text('Rating and source', '★ {rating}', { x, y: y+0.25*scale, w: width, h: 0.047*scale, size: 0.031*scale, color: '@accent', weight: 800, wrap: false }),
      text('Title details', '{year} · {episodes} · {runtime} · {audio}', { x, y: y+0.31*scale, w: width, h: 0.046*scale, size: 0.03*scale, weight: 700, wrap: false }),
      text('Genre tags', '{genres}', { role: 'genre-tags', x, y: y+0.37*scale, w: width, h: 0.09*scale, size: 0.023*scale, color: '@text', highlight: '@surface' }),
      rect('Poster callout', { x, y: land ? 0.9 : 0.86, w: land ? 0.26 : 0.56, h: 0.065*scale, fill: '@accent', radius: 0.035*scale }),
      text('Visual callout', '▶ WATCH NOW', { x: x+0.016, y: land ? 0.905 : 0.863, w: land ? 0.225 : 0.52, h: 0.055*scale, size: 0.028*scale, weight: 800, color: '@bg', align: 'center', wrap: false }),
    ];
  },
};
const referenceSplit: TemplateDef = {
  id: 'reference-split', name: 'Design 2 — Reference Split Panel', description: 'Portrait artwork with translucent title and information cards.',
  build({ w,h }) {
    const land = w > h;
    const px = land ? 0.44 : 0.06, pw = land ? 0.52 : 0.88, top = land ? 0.13 : 0.49, s = land ? 1 : 0.55;
    const titleY = top+0.045*s, cardsY = top+0.32*s;
    const fields: [MetaField,string][] = [['releaseDate','Release date'],['status','Status'],['type','Type'],['rating','Rating / source']];
    const layers: Layer[] = [
      img('Blurred cinematic background', { role: 'background', removable: false, blur: 32, zoom: 1.12 }),
      rect('Background shade', { fill: '@bg/0.5', gradTo: '@bg/0.75', gradAngle: 0 }),
      rect('Poster border', { x: land ? 0.035 : 0.215, y: land ? 0.075 : 0.03, w: land ? 0.355 : 0.57, h: land ? 0.85 : 0.415, fill: '@surface', radius: 0.025*s, stroke: '@text/0.25', strokeWidth: 0.0015 }),
      img('Portrait poster', { role: 'artwork', removable: false, fit: 'contain', x: land ? 0.04 : 0.22, y: land ? 0.08 : 0.035, w: land ? 0.345 : 0.56, h: land ? 0.84 : 0.405, radius: 0.02*s }),
      text('Genres', '{genres}', { x: px+0.012, y: top-0.063*s, w: pw-0.13, h: 0.045*s, size: 0.021*s, weight: 800, uppercase: true, wrap: false, highlight: '@surface/0.75' }),
      rect('Title panel', { x: px, y: top, w: pw, h: 0.27*s, fill: '@surface/0.85', radius: 0.015*s }),
      text('Studio', 'STUDIO · {studio}', { x: px+0.014, y: top+0.008*s, w: pw-0.03, h: 0.033*s, size: 0.021*s, weight: 700, wrap: false }),
      text('Main title', '{title}', { role:'title', x: px+0.014, y: titleY, w: pw-0.03, h: 0.145*s, size: 0.082*s, font: 'Sora', weight: 800, autoFit: true, lineHeight: 1.05 }),
      text('Season or subtitle', '{season} · {altTitle}', { x:px+0.014, y:top+0.203*s, w:pw-0.03, h:0.05*s, size:0.032*s, weight:800, wrap:false }),
      rect('Synopsis card', { x:px+pw*0.47, y:cardsY, w:pw*0.53, h:0.52*s, fill:'@surface/0.85', radius:0.014*s, stroke:'@text/0.25', strokeWidth:0.001, dependsOn:['synopsis'] }),
      text('Synopsis label','Synopsis', { x:px+pw*0.49, y:cardsY+0.017*s, w:pw*0.49-0.014, h:0.04*s, size:0.025*s, uppercase:true, dependsOn:['synopsis'] }),
      text('Synopsis','{synopsis}', { x:px+pw*0.49, y:cardsY+0.068*s, w:pw*0.49-0.014, h:0.425*s, size:0.024*s, lineHeight:1.3, autoFit:true }),
    ];
    fields.forEach(([field,label],i) => {
      const y=cardsY+i*0.134*s, width=pw*0.435;
      layers.push(rect(`${label} card`, { x:px,y,w:width,h:0.118*s,fill:'@surface/0.85',radius:0.014*s,stroke:'@text/0.25',strokeWidth:0.001,dependsOn:[field] }),
        text(`${label} label`,label,{ x:px+0.012,y:y+0.012*s,w:width-0.024,h:0.034*s,size:0.02*s,uppercase:true,dependsOn:[field],wrap:false }),
        text(`${label} value`,`{${field}}`,{ x:px+0.012,y:y+0.047*s,w:width-0.024,h:0.061*s,size:0.029*s,weight:800,autoFit:true }));
    });
    return layers;
  },
};
export const TEMPLATES: TemplateDef[] = [classic, cinematic, split, referenceSplit].map(template => ({ ...template, build(canvas:Canvas) { return [...template.build(canvas), logoLayer(canvas)]; } }));
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0] ?? classic;
