import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestOmdb } from '../lib/omdb.server';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function response(status: number, body: unknown) {
  vi.stubEnv('OMDB_API_KEY', 'fixture-only');
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
describe('OMDb request and diagnosis', () => {
  it('reads OMDB_API_KEY and sends a minimal IMDb ID request without bearer auth', async () => {
    const fetcher = response(200, { Response: 'True', Title: 'The Shawshank Redemption', imdbID: 'tt0111161' });
    const result = await requestOmdb({ i: 'tt0111161' });
    expect(result.ok).toBe(true);
    const url = fetcher.mock.calls[0]?.[0] as URL;
    expect(url.origin).toBe('https://www.omdbapi.com');
    expect(url.searchParams.get('apikey')).toBe('fixture-only');
    expect(url.searchParams.get('i')).toBe('tt0111161');
    expect(fetcher.mock.calls[0]?.[1].headers).toEqual({ Accept: 'application/json' });
  });
  it('does not request OMDb when backend configuration is missing', async () => {
    vi.stubEnv('OMDB_API_KEY', '');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: false, code: 'configuration', status: null });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reads a 401 error body and does not falsely distinguish activation from invalid credentials', async () => {
    response(401, { Response: 'False', Error: 'Invalid API key!' });
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: false, code: 'credentials', status: 401 });
  });
  it('distinguishes explicit activation errors', async () => {
    response(200, { Response: 'False', Error: 'API key not activated' });
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: false, code: 'activation' });
  });
  it('recognizes daily limits even on 401 responses', async () => {
    response(401, { Response: 'False', Error: 'Request limit reached!' });
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: false, code: 'rate_limit' });
  });
  it('recognizes HTTP 429', async () => {
    response(429, {});
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: false, code: 'rate_limit' });
  });
  it('handles a non-JSON provider outage', async () => {
    vi.stubEnv('OMDB_API_KEY', 'fixture-only');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })));
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: false, code: 'unavailable' });
  });
  it('never treats a 200 API failure as a success', async () => {
    response(200, { Response: 'False', Error: 'Movie not found!' });
    expect(await requestOmdb({ t: 'missing', plot: 'full' })).toMatchObject({ ok: false, code: 'not_found' });
  });
  it('rejects malformed successful responses', async () => {
    response(200, { Response: 'True' });
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: false, code: 'response' });
  });
  it('does not leak raw provider errors containing credentials', async () => {
    response(400, { Response: 'False', Error: 'Rejected fixture-only' });
    const result = await requestOmdb({ i: 'tt0111161' });
    expect(JSON.stringify(result)).not.toContain('fixture-only');
    expect(result.ok).toBe(false);
  });
  it('returns only safe metadata on success', async () => {
    response(200, { Response: 'True', Title: 'Movie', imdbID: 'tt0111161', Error: 'fixture-only', Plot: 'fixture-only', extra: 'fixture-only' });
    expect(await requestOmdb({ i: 'tt0111161' })).toMatchObject({ ok: true, data: { Title: 'Movie', imdbID: 'tt0111161' } });
    expect(JSON.stringify(await requestOmdb({ i: 'tt0111161' }))).not.toContain('fixture-only');
  });
  it('handles network errors without returning their credential-bearing URLs', async () => {
    vi.stubEnv('OMDB_API_KEY', 'fixture-only');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('https://www.omdbapi.com/?apikey=fixture-only')));
    const result = await requestOmdb({ i: 'tt0111161' });
    expect(result).toMatchObject({ ok: false, code: 'network' });
    expect(JSON.stringify(result)).not.toContain('fixture-only');
  });
});