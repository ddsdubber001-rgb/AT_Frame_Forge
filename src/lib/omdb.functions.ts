import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { providerEnabled, safeFetch } from './admin.server';
export const searchOmdb = createServerFn({ method: 'GET' }).inputValidator(z.object({ query: z.string().trim().min(1).max(200) })).handler(async ({ data }) => {
  if (!(await providerEnabled('omdb'))) return { json: '[]', error: null };
  const key = process.env['OMDB_API_KEY'];
  if (!key) return { json: '[]', error: 'OMDb is enabled but its hosting credential is missing.' };
  try {
    const result = await safeFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&t=${encodeURIComponent(data.query)}&plot=full`);
    if (result.Response !== 'True') return { json: '[]', error: 'OMDb found no match or could not validate credentials.' };
    return { json: JSON.stringify([result]), error: null };
  } catch { return { json: '[]', error: 'OMDb unavailable. Other sources remain available.' }; }
});