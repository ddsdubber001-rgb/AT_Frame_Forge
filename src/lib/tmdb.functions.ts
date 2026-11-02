import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { providerCredential, providerEnabled } from './admin.server';
import { requestTmdb } from './tmdb.server';
type Json = Record<string, unknown>;
export const searchTmdb = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ query: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }) => {
    try {
      const configured = Boolean(providerCredential('tmdb')?.trim());
      if (!(await providerEnabled('tmdb'))) return { configured, json: '[]', error: 'Integration is disabled.', status: null };
      const result = await requestTmdb(`/search/multi?include_adult=false&query=${encodeURIComponent(data.query)}`);
      if (!result.ok) return { configured, json: '[]', error: result.message, status: result.status };
      if (!Array.isArray(result.data['results'])) return { configured, json: '[]', error: `HTTP ${result.status}: unexpected TMDB search response.`, status: result.status };
      const results = (result.data['results'] as Json[]).filter(r => (r['media_type'] === 'movie' || r['media_type'] === 'tv') && typeof r['id'] === 'number').slice(0, 8);
      return { configured, json: JSON.stringify(results), error: null, status: result.status };
    } catch { return { configured: false, json: '[]', error: 'Integration settings could not be loaded. Try again shortly.', status: null }; }
  });
export const tmdbDetails = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ kind: z.enum(['tv', 'movie']), id: z.string().regex(/^\d{1,12}$/) }))
  .handler(async ({ data }) => {
    try {
      if (!(await providerEnabled('tmdb'))) return { json: null, error: 'TMDB: integration is disabled.' };
      const result = await requestTmdb(`/${data.kind}/${data.id}?append_to_response=external_ids,${data.kind === 'tv' ? 'content_ratings' : 'release_dates'}`);
      if (!result.ok) return { json: null, error: `TMDB: ${result.message}` };
      if (String(result.data['id']) !== data.id) return { json: null, error: 'TMDB: details did not match the selected title.' };
      return { json: JSON.stringify(result.data), error: null };
    } catch { return { json: null, error: 'TMDB: integration settings could not be loaded. Try again shortly.' }; }
  });
