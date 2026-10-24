const OK = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 30 * 1024 * 1024;
const MAX_SIDE = 4096;

export interface LoadedImage { dataUrl: string; w: number; h: number }

/** Validates and reads an image. Very large images are downscaled (aspect preserved) to keep storage safe. */
export async function readImageFile(file: File): Promise<LoadedImage> {
  if (!OK.includes(file.type)) throw new Error(`${file.name}: only JPG, PNG and WEBP are supported`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name}: file is larger than 30 MB`);
  const url = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
  return normalise(url, file.type);
}

export async function normalise(url: string, type = "image/jpeg"): Promise<LoadedImage> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("The image appears to be damaged or unsupported"));
    i.src = url;
  });
  const { naturalWidth: w, naturalHeight: h } = img;
  if (Math.max(w, h) <= MAX_SIDE && url.startsWith("data:")) return { dataUrl: url, w, h };
  const s = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL(type === "image/png" ? "image/png" : "image/jpeg", 0.93), w: c.width, h: c.height };
}

/** Fetches a remote poster (metadata source) as a local data URL so it can be exported. */
export async function importRemoteImage(src: string): Promise<LoadedImage> {
  const r = await fetch(src);
  if (!r.ok) throw new Error("Could not download the source poster");
  const blob = await r.blob();
  const url = await new Promise<string>((res) => { const f = new FileReader(); f.onload = () => res(String(f.result)); f.readAsDataURL(blob); });
  return normalise(url, blob.type);
}
