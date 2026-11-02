import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { providerEnabled } from './admin.server';
import { requestOmdb } from './omdb.server';
export const searchOmdb = createServerFn({ method: 'GET' }).inputValidator(z.object({ query: z.string().trim().min(1).max(200) })).handler(async ({ data }) => {
  try {
    if (!(await providerEnabled('omdb'))) return { json: '[]', error: null, status: null };
    const result = await requestOmdb({ t: data.query, plot: 'full' });
    return result.ok ? { json: JSON.stringify([result.data]), error: null, status: result.status } : { json: '[]', error: result.message, status: result.status };
  } catch { return { json: '[]', error: 'Integration settings could not be loaded. Try again shortly.', status: null }; }
});