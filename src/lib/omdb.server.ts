import { providerCredential } from './admin.server';

type OmdbData = Record<string, string>;
type OmdbResult =
  | { ok: true; status: number; data: OmdbData; message: string }
  | { ok: false; status: number | null; code: string; message: string };

const fields = ['Title', 'Year', 'Released', 'Type', 'Runtime', 'Genre', 'Plot', 'Language', 'Rated', 'imdbID', 'imdbRating', 'Poster'];

/** Parse OMDb's JSON even on non-2xx responses; never return provider errors or request URLs. */
export async function requestOmdb(params: { i: string } | { t: string; plot: 'full' }): Promise<OmdbResult> {
  const key = providerCredential('omdb')?.trim();
  if (!key) return { ok: false, status: null, code: 'configuration', message: 'OMDb backend configuration is missing. Configure OMDB_API_KEY in Lovable project Settings → Secrets.' };
  const url = new URL('https://www.omdbapi.com/');
  url.search = new URLSearchParams({ ...params, apikey: key }).toString();
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  } catch {
    return { ok: false, status: null, code: 'network', message: 'OMDb could not be reached or timed out. Try again shortly.' };
  }
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch { /* Non-JSON outages are classified by HTTP status below. */ }
  const error = typeof body['Error'] === 'string' ? body['Error'].toLowerCase() : '';
  const fail = (code: string, message: string): OmdbResult => ({ ok: false, status: response.status, code, message });
  if (response.status === 429 || /request limit|daily limit|quota|too many requests/.test(error))
    return fail('rate_limit', 'OMDb request limit reached. Wait for your account quota to reset or review your OMDb plan.');
  if (/activat/.test(error))
    return fail('activation', 'OMDb reports that this key is not activated. Use the activation link in your OMDb email, then retry.');
  if (response.status === 401 || /invalid api key|no api key/.test(error))
    return fail('credentials', 'OMDb rejected the configured key (HTTP ' + response.status + '). It may be invalid or not activated; OMDb does not distinguish these here. Check your OMDb activation email and replace OMDB_API_KEY in Lovable project Settings → Secrets if needed.');
  if (response.status === 403)
    return fail('access', 'OMDb denied access. Check your OMDb key activation and account access.');
  if (response.status >= 500)
    return fail('unavailable', 'OMDb is temporarily unavailable. Try again shortly.');
  if (/not found|incorrect imdb/.test(error))
    return fail('not_found', 'OMDb found no matching title. Try another title.');
  if (!response.ok || body['Response'] !== 'True' || typeof body['imdbID'] !== 'string' || !/^tt\d+$/.test(body['imdbID']) || typeof body['Title'] !== 'string')
    return fail('response', 'OMDb returned an unsuccessful or unexpected response. Try again shortly; check account access if it persists.');
  const data: OmdbData = { Response: 'True' };
  for (const field of fields) {
    const value = body[field];
    if (typeof value === 'string' && !value.includes(key)) data[field] = value;
  }
  if (!data['Title'] || !data['imdbID']) return fail('response', 'OMDb returned an unexpected response. Try again shortly.');
  return { ok: true, status: response.status, data, message: 'Connection successful' };
}