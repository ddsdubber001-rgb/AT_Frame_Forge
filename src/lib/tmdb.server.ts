import { providerCredential } from './admin.server';
import { providerJson, type ProviderReply } from './provider-http.server';

const fields = new Set(['results', 'id', 'media_type', 'title', 'name', 'original_title', 'original_name', 'release_date', 'first_air_date', 'overview', 'original_language', 'vote_count', 'vote_average', 'poster_path', 'imdb_id', 'external_ids', 'genres', 'status', 'production_companies', 'episode_run_time', 'number_of_seasons', 'number_of_episodes', 'content_ratings', 'iso_3166_1', 'rating', 'runtime', 'release_dates', 'certification']);
export async function requestTmdb(path: string): Promise<ProviderReply> {
  const key = providerCredential('tmdb')?.trim();
  if (!key) return { ok: false, status: null, data: null, message: 'Configure TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in hosting secrets.' };
  const token = process.env['TMDB_READ_ACCESS_TOKEN']?.trim();
  // Explicit token takes precedence; TMDB_API_KEY also supports an existing JWT token.
  const bearer = Boolean(token) || key.split('.').length === 3;
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  if (!bearer) url.searchParams.set('api_key', key);
  const result = await providerJson('TMDB', url, { headers: { Accept: 'application/json', ...(bearer ? { Authorization: `Bearer ${key}` } : {}) } });
  if (!result.ok) return result;
  if (result.data['success'] === false) return { ok: false, status: result.status, data: null, message: `HTTP ${result.status}: TMDB rejected the request.` };
  const clean = (value: unknown): unknown => {
    if (typeof value === 'string') return value.includes(key) ? '' : value;
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([field]) => fields.has(field)).map(([field, val]) => [field, clean(val)]));
    return value;
  };
  return { ...result, data: clean(result.data) as Record<string, unknown> };
}
