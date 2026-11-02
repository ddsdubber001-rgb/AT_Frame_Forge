import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestTmdb } from '../lib/tmdb.server';
import { requestAnime } from '../lib/anime.server';
import { providerJson } from '../lib/provider-http.server';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const respond = (body: unknown, status = 200) => { const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })); vi.stubGlobal('fetch', fetcher); return fetcher; };
describe('provider request contracts', () => {
  it('sends TMDB_READ_ACCESS_TOKEN as bearer, never in URL', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'fixture-token'); vi.stubEnv('TMDB_API_KEY', 'fixture-key');
    const f = respond({ results: [] });
    expect((await requestTmdb('/search/multi?query=Naruto')).ok).toBe(true);
    expect(f.mock.calls[0]?.[0].searchParams.has('api_key')).toBe(false);
    expect(f.mock.calls[0]?.[1].headers.Authorization).toBe('Bearer fixture-token');
  });
  it('sends TMDB_API_KEY as api_key when no token is configured', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', ' '); vi.stubEnv('TMDB_API_KEY', 'fixture-key');
    const f = respond({ results: [] }); await requestTmdb('/search/multi?query=Naruto');
    expect(f.mock.calls[0]?.[0].searchParams.get('api_key')).toBe('fixture-key');
    expect(f.mock.calls[0]?.[1].headers.Authorization).toBeUndefined();
  });
  it('does not leak provider payloads containing credentials', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'fixture-token');
    respond({ success: false, status_message: 'fixture-token' }, 401);
    expect(JSON.stringify(await requestTmdb('/search/multi?query=test'))).not.toContain('fixture-token');
  });
  it('uses the exact Jikan HTTPS anime search and validates JSON data', async () => {
    const f = respond({ data: [{ mal_id: 20 }] });
    expect((await requestAnime('jikan', 'Naruto')).ok).toBe(true);
    const url = f.mock.calls[0]?.[0] as URL;
    expect(url.origin + url.pathname).toBe('https://api.jikan.moe/v4/anime');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'Naruto', limit: '8', sfw: 'true' });
  });
  it('reports HTTP 429 independently and does not trust GraphQL errors on HTTP 200', async () => {
    respond({}, 429); expect(await requestAnime('jikan', 'Naruto')).toMatchObject({ ok: false, status: 429 });
    respond({ errors: [{ message: 'raw untrusted error' }] });
    expect(await requestAnime('anilist', 'Naruto')).toMatchObject({ ok: false, status: 200 });
  });
  it('classifies network failures without leaking exception URLs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret-bearing-url')));
    expect(await providerJson('Jikan', 'https://api.jikan.moe/v4/anime')).toMatchObject({ ok: false, status: null });
    expect(JSON.stringify(await providerJson('Jikan', 'https://api.jikan.moe/v4/anime'))).not.toContain('secret-bearing-url');
  });
});
