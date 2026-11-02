import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../lib/anime.functions', () => ({ searchAnime: vi.fn() }));
vi.mock('../lib/tmdb.functions', () => ({ searchTmdb: vi.fn(), tmdbDetails: vi.fn() }));
vi.mock('../lib/omdb.functions', () => ({ searchOmdb: vi.fn() }));
import { searchAnime } from '../lib/anime.functions';
import { searchTmdb, tmdbDetails } from '../lib/tmdb.functions';
import { searchOmdb } from '../lib/omdb.functions';
import { searchAll, resolveResult } from '../lib/metadata';
afterEach(() => vi.resetAllMocks());
describe('independent metadata search', () => {
  it('keeps successful TMDB matches when OMDb and Jikan fail, with exact provider errors', async () => {
    vi.mocked(searchAnime).mockImplementation(async ({ data }) => ({ json: data.provider === 'anilist' ? JSON.stringify({ data: { Page: { media: [] } } }) : '{}', error: data.provider === 'jikan' ? 'Request timed out before an HTTP response. Try again shortly.' : null, status: data.provider === 'jikan' ? null : 200 }));
    vi.mocked(searchTmdb).mockResolvedValue({ configured: true, json: JSON.stringify([{ id: 12, media_type: 'movie', title: 'Exact movie', release_date: '2020-01-02' }]), error: null, status: 200 });
    vi.mocked(searchOmdb).mockResolvedValue({ json: '[]', error: 'OMDb rejected the configured key (HTTP 401).', status: 401 });
    const result = await searchAll('Exact movie');
    expect(result.results.map(r => r.key)).toEqual(['tmdb-movie-12']);
    expect(result.errors).toContain('OMDb: OMDb rejected the configured key (HTTP 401).');
    expect(result.errors.some(e => e.startsWith('Jikan: Request timed out'))).toBe(true);
    expect(result.errors.some(e => e.startsWith('TMDB:'))).toBe(false);
  });
  it('populates the exact selected result and leaves unavailable fields empty', async () => {
    vi.mocked(searchTmdb).mockResolvedValue({ configured: true, json: JSON.stringify([{ id: 12, media_type: 'movie', title: 'Selected title', release_date: '2020-01-02' }, { id: 13, media_type: 'movie', title: 'Other title' }]), error: null, status: 200 });
    vi.mocked(tmdbDetails).mockResolvedValue({ json: JSON.stringify({ id: 12, genres: [{ name: 'Drama' }], imdb_id: 'tt0111161' }), error: null });
    const result = await searchAll('title', ['tmdb']);
    const selected = result.results[0];
    if (!selected) throw new Error('Expected selectable result');
    const meta = await resolveResult(selected);
    expect(tmdbDetails).toHaveBeenCalledWith({ data: { kind: 'movie', id: '12' } });
    expect(meta).toMatchObject({ title: 'Selected title', year: '2020', releaseDate: '2020-01-02', genres: 'Drama', imdbId: 'tt0111161', studio: '', rating: '', synopsis: '' });
  });
});
