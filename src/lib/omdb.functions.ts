import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { providerEnabled } from './admin.server';
import { requestOmdb } from './omdb.server';
export const searchOmdb = createServerFn({ method: 'GET' }).inputValidator(z.object({ query: z.string().trim().min(1).max(200) })).handler(async ({ data }) => {
  if (!(await providerEnabled('omdb'))) return { json: '[]', error: null };
  const result = await requestOmdb({ t: data.query, plot: 'full' });
  return result.ok ? { json: JSON.stringify([result.data]), error: null } : { json: '[]', error: result.message };
});