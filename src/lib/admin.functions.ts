import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { adminDb, adminSession, loginAdmin, providerCredential, providerEnabled, requireAdmin } from './admin.server';
import { PROVIDERS } from './admin-policy';
import { requestOmdb } from './omdb.server';
import { requestTmdb } from './tmdb.server';
import { requestAnime } from './anime.server';
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
    if (data.id === 'anilist' || data.id === 'jikan') {
      const result = await requestAnime(data.id, 'Naruto');
      return { ok: result.ok, message: result.message };
    }
    if (data.id === 'tmdb') {
      const result = await requestTmdb('/search/multi?include_adult=false&query=Naruto');
      if (result.ok && !Array.isArray(result.data['results'])) return { ok: false, message: `HTTP ${result.status}: unexpected TMDB search response.` };
      return { ok: result.ok, message: result.message };
    }
    if (data.id === 'omdb') {
      const result = await requestOmdb({ i: 'tt0111161' });
      return { ok: result.ok, message: result.message };
    }
    return { ok: true, message: 'Connection verified.' };
  } catch { return { ok: false, message: 'Connection failed. Check credentials, provider availability or rate limits.' }; }
});
export const enabledProviders = createServerFn({ method: 'GET' }).handler(async () => {
  const enabled = [];
  for (const p of PROVIDERS) if (await providerEnabled(p.id)) enabled.push(p.id);
  return enabled;
});