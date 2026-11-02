import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { providerEnabled } from './admin.server';
import { requestAnime } from './anime.server';
export const searchAnime = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ provider: z.enum(['anilist', 'jikan']), query: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }) => {
    try {
      if (!(await providerEnabled(data.provider))) return { json: '{}', error: 'Integration is disabled.', status: null };
      const result = await requestAnime(data.provider, data.query);
      return { json: result.ok ? JSON.stringify(result.data) : '{}', error: result.ok ? null : result.message, status: result.status };
    } catch { return { json: '{}', error: 'Integration settings could not be loaded. Try again shortly.', status: null }; }
  });
