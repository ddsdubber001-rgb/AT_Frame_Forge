export const META_FIELDS = [
  "title", "altTitle", "type", "year", "releaseDate", "season", "episodes", "seasons", "runtime",
  "genres", "status", "language", "audio", "studio", "ageRating", "rating", "synopsis", "imdbId",
] as const;
export type MetaField = (typeof META_FIELDS)[number];

export type Meta = Record<MetaField, string> & { source: string; sourceId: string; imageUrl: string };

export const META_LABELS: Record<MetaField, string> = {
  title: "Official title", altTitle: "Alternative title", type: "Type", year: "Year",
  releaseDate: "Release date", season: "Season", episodes: "Episodes", seasons: "Seasons",
  runtime: "Runtime / duration", genres: "Genres", status: "Status", language: "Original language",
  audio: "Audio / languages", studio: "Studio / production", ageRating: "Age rating",
  rating: "Rating (with source)", synopsis: "Synopsis", imdbId: "IMDb identifier (via provider)",
};

export function emptyMeta(): Meta {
  const m = { source: "", sourceId: "", imageUrl: "" } as Meta;
  for (const f of META_FIELDS) m[f] = "";
  return m;
}

export interface Palette { bg: string; surface: string; accent: string; text: string; muted: string }
export type PaletteKey = keyof Palette;

export type LayerKind = "image" | "rect" | "text";

export interface Layer {
  id: string; name: string; kind: LayerKind; role?: string;
  x: number; y: number; w: number; h: number; rotation: number; opacity: number;
  visible: boolean; locked: boolean; removable: boolean;
  dependsOn?: MetaField[];
  // image
  fit?: "cover" | "contain"; zoom?: number; offsetX?: number; offsetY?: number; blur?: number; radius?: number;
  // rect
  fill?: string; gradTo?: string | null; gradAngle?: number; stroke?: string | null; strokeWidth?: number;
  // text
  text?: string; font?: string; size?: number; weight?: number; italic?: boolean; color?: string;
  align?: "left" | "center" | "right"; letterSpacing?: number; lineHeight?: number; wrap?: boolean;
  uppercase?: boolean; shadow?: number; shadowColor?: string; outline?: number; outlineColor?: string;
  glow?: number; glowColor?: string; gradientTo?: string | null; highlight?: string | null;
  defaults?: Partial<Layer>;
}

export type ExportFormat = "png" | "jpeg" | "webp";
export interface ExportPrefs { format: ExportFormat; w: number; h: number; quality: number; transparent: boolean }

export interface Project {
  id: string; name: string; createdAt: number; updatedAt: number;
  image: string | null; imageW: number; imageH: number;
  meta: Meta; templateId: string; layersByTemplate: Record<string, Layer[]>;
  palette: Palette; paletteName: string; canvas: { w: number; h: number };
  exportPrefs: ExportPrefs; thumbnail?: string | undefined;
}
