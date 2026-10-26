export const ADMIN_SESSION_SECONDS = 3600;
export const ADMIN_LOGIN_LIMIT = 5;
export const ADMIN_LOGIN_WINDOW_MINUTES = 15;
export const PROVIDERS = [
  { id: 'anilist', name: 'AniList', secret: '', defaultEnabled: true, description: 'Public anime metadata. No API key required.' },
  { id: 'jikan', name: 'Jikan / MyAnimeList', secret: '', defaultEnabled: true, description: 'Public Jikan anime metadata. No API key required.' },
  { id: 'tmdb', name: 'TMDB', secret: 'TMDB_API_KEY', defaultEnabled: true, description: 'Movie and TV metadata. TMDB v3 key or API read-access token.' },
  { id: 'omdb', name: 'IMDb-related / OMDb', secret: 'OMDB_API_KEY', defaultEnabled: false, description: 'Optional third-party OMDb metadata and IMDb identifiers. Not a direct IMDb API; obtain access at omdbapi.com and review provider terms.' },
] as const;
export type ProviderId = typeof PROVIDERS[number]['id'];