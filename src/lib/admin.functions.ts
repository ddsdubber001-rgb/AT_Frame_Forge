import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { adminDb, adminSession, loginAdmin, providerCredential, providerEnabled, requireAdmin, safeFetch } from './admin.server';
import { PROVIDERS } from './admin-policy';
const id = z.enum(['anilist', 'jikan', 'tmdb', 'omdb']);
export const adminLogin = createServerFn({ method: 'POST' }).inputValidator(z.object({ password: z.string().min(1).max(128) })).handler(({ data }) => loginAdmin(data.password));
export const adminState = createServerFn({ method: 'GET' }).handler(async () => {
  if (!process.env['ADMIN_SESSION_SECRET']) return { authenticated: false, error: 'ADMIN_SESSION_SECRET is missing from hosting secrets.' };
  try { await requireAdmin(); return { authenticated: true, error: null }; } catch { return { authenticated: false, error: null }; }
});
export const adminLogout = createServerFn({ method: 'POST' }).handler(async () => { const session = await adminSession(); await session.clear(); return { ok: true }; });
export const adminSettings = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin();
  const db = await adminDb();
  const [profileResult, integrationsResult] = await Promise.all([
    db.from('forge_admin_profile').select('display_name').eq('id','admin').maybeSingle(),
    db.from('forge_integrations').select('id, enabled'),
  ]);
  if (profileResult.error || integrationsResult.error) throw new Error('Admin settings could not be read. Check the admin database configuration.');
  const profile = profileResult.data;
  const providers = PROVIDERS.map(p => ({ ...p,
    enabled: integrationsResult.data?.find(row => row.id === p.id)?.enabled ?? p.defaultEnabled,
    configured: p.secret ? Boolean(providerCredential(p.id)) : true,
  }));
  return { providers, displayName: profile?.display_name ?? 'Administrator' };
});
export const setIntegration = createServerFn({ method: 'POST' }).inputValidator(z.object({ id, enabled: z.boolean() })).handler(async ({ data }) => {
  await requireAdmin(); const db = await adminDb();
  const { error } = await db.from('forge_integrations').upsert({ ...data, updated_at: new Date().toISOString() });
  if (error) throw new Error('Settings could not be saved.'); return { ok: true };
});
export const saveAdminProfile = createServerFn({ method: 'POST' }).inputValidator(z.object({ displayName: z.string().trim().min(1).max(80) })).handler(async ({ data }) => {
  await requireAdmin(); const db = await adminDb();
  const { error } = await db.from('forge_admin_profile').upsert({ id: 'admin', display_name: data.displayName });
  if (error) throw new Error('Profile could not be saved.'); return { ok: true };
});
export const testIntegration = createServerFn({ method: 'POST' }).inputValidator(z.object({ id })).handler(async ({ data }) => {
  await requireAdmin();
  try {
    if (!(await providerEnabled(data.id))) return { ok: false, message: 'Integration is disabled.' };
    if (data.id === 'anilist') await safeFetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '{Media(id:1){id}}' }) });
    if (data.id === 'jikan') await safeFetch('https://api.jikan.moe/v4/anime/1');
    if (data.id === 'tmdb') {
       const key = providerCredential('tmdb'); if (!key) return { ok: false, message: 'Configure TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in hosting secrets.' };
      const bearer = key.length > 60;
      await safeFetch(`https://api.themoviedb.org/3/configuration${bearer ? '' : '?api_key=' + encodeURIComponent(key)}`, { headers: bearer ? { Authorization: `Bearer ${key}` } : {} });
    }
    if (data.id === 'omdb') {
      const key = process.env['OMDB_API_KEY']; if (!key) return { ok: false, message: 'Configure OMDB_API_KEY in hosting secrets.' };
      const result = await safeFetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&i=tt0111161`);
      if (result.Response !== 'True') return { ok: false, message: 'OMDb credentials rejected or provider unavailable.' };
    }
    return { ok: true, message: 'Connection verified.' };
  } catch { return { ok: false, message: 'Connection failed. Check credentials, provider availability or rate limits.' }; }
});
export const enabledProviders = createServerFn({ method: 'GET' }).handler(async () => {
  const enabled = [];
  for (const p of PROVIDERS) if (await providerEnabled(p.id)) enabled.push(p.id);
  return enabled;
});