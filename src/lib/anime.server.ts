import { providerJson } from './provider-http.server';

const ANILIST_Q = `query($q:String){Page(perPage:8){media(search:$q,type:ANIME,sort:SEARCH_MATCH){id title{romaji english native} synonyms startDate{year month day} season seasonYear episodes duration format status genres description(asHtml:false) studios(isMain:true){nodes{name}} averageScore isAdult coverImage{extraLarge large}}}}`;
export async function requestAnime(provider: 'anilist' | 'jikan', query: string) {
  const url = new URL(provider === 'anilist' ? 'https://graphql.anilist.co' : 'https://api.jikan.moe/v4/anime');
  if (provider === 'jikan') url.search = new URLSearchParams({ q: query, limit: '8', sfw: 'true' }).toString();
  const result = await providerJson(provider === 'anilist' ? 'AniList' : 'Jikan', url, provider === 'anilist' ? {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: ANILIST_Q, variables: { q: query } }),
  } : { headers: { Accept: 'application/json' } });
  if (!result.ok) return result;
  const data = result.data['data'];
  const page = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>)['Page'] : null;
  const media = page && typeof page === 'object' ? (page as Record<string, unknown>)['media'] : null;
  const valid = provider === 'jikan' ? Array.isArray(data) : Array.isArray(media) && !result.data['errors'];
  if (!valid) return { ok: false as const, status: result.status, data: null, message: `HTTP ${result.status}: unexpected ${provider === 'jikan' ? 'Jikan' : 'AniList'} response.` };
  return result;
}
