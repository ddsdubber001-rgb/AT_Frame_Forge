import { createServerFn } from "@tanstack/react-start";
import { z } from 'zod';
import { providerCredential, providerEnabled } from './admin.server';

type Json = Record<string, unknown>;

async function tmdb(path: string): Promise<Json | null> {
  if (!(await providerEnabled('tmdb'))) return null;
  const key = providerCredential('tmdb');
  if (!key) return null;
  const bearer = key.length > 60;
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}${bearer ? "" : `api_key=${encodeURIComponent(key)}`}`;
  const r = await fetch(url, { headers: bearer ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(12000) });
  if (r.status === 429) throw new Error("TMDB rate limit reached, try again shortly");
  if (!r.ok) throw new Error(`TMDB error ${r.status}`);
  return (await r.json()) as Json;
}

export const searchTmdb = createServerFn({ method: "GET" })
  .inputValidator(z.object({ query: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }) => {
    try {
      const j = await tmdb(`/search/multi?include_adult=false&query=${encodeURIComponent(data.query)}`);
      if (!j) return { configured: false, json: "[]", error: null as string | null };
      const results = ((j["results"] as Json[]) ?? []).filter((r) => r["media_type"] === "movie" || r["media_type"] === "tv").slice(0, 8);
      return { configured: true, json: JSON.stringify(results), error: null as string | null };
    } catch (e) {
      return { configured: true, json: "[]", error: (e as Error).message as string | null };
    }
  });

export const tmdbDetails = createServerFn({ method: "GET" })
  .inputValidator(z.object({ kind: z.enum(['tv','movie']), id: z.string().regex(/^\d{1,12}$/) }))
  .handler(async ({ data }) => {
    try {
      const j = await tmdb(`/${data.kind}/${data.id}?append_to_response=external_ids,${data.kind === "tv" ? "content_ratings" : "release_dates"}`);
      return { json: j ? JSON.stringify(j) : null, error: j ? null : "TMDB is not configured" };
    } catch (e) {
      return { json: null as string | null, error: (e as Error).message as string | null };
    }
  });
