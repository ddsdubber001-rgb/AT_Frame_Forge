import asset from '@/assets/anime-tamilan.jpg.asset.json';
export const LOGO_URL = asset.url;
let pending: Promise<HTMLImageElement> | undefined;
export function loadLogo() {
  pending ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => { pending = undefined; reject(new Error('ANIME TAMILAN logo could not be loaded')); };
    image.src = LOGO_URL;
  });
  return pending;
}