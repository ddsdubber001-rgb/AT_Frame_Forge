import { hash, compare } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { useSession, getRequestIP } from '@tanstack/react-start/server';
import { ADMIN_SESSION_SECONDS, PROVIDERS, type ProviderId } from './admin-policy';

export async function adminDb() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}
export async function adminSession() {
  const password = process.env['ADMIN_SESSION_SECRET'];
  if (!password) throw new Error('Admin sessions need hosting configuration.');
  return useSession<{ admin?: boolean; authenticatedAt?: number }>({ password, name: 'forge-admin', maxAge: ADMIN_SESSION_SECONDS,
    cookie: { httpOnly: true, secure: true, sameSite: 'strict', path: '/' } });
}
export async function requireAdmin() {
  const session = await adminSession();
  if (!session.data.admin || !session.data.authenticatedAt || Date.now() - session.data.authenticatedAt > ADMIN_SESSION_SECONDS * 1000) throw new Error('Admin authentication required.');
  return session;
}
export async function loginAdmin(password: string) {
  const db = await adminDb();
  const ip = getRequestIP() || 'unknown';
  const bucket = createHash('sha256').update(ip).digest('hex');
  const { data: allowed, error: limitError } = await db.rpc('forge_consume_login', { bucket });
  if (limitError) throw new Error('Admin login unavailable.');
  if (!allowed) return { ok: false, error: 'Too many attempts. Wait 15 minutes.' };
  let { data: admin, error } = await db.from('forge_admin').select('password_hash').eq('id', 'admin').maybeSingle();
  if (error) throw new Error('Admin login unavailable.');
  if (!admin) {
    const initial = process.env['ADMIN_INITIAL_PASSWORD'];
    if (!initial) return { ok: false, error: 'Initial admin credential needs secure hosting setup.' };
    // Atomic insert prevents a competing first request from replacing an existing credential.
    const password_hash = await hash(initial, 12);
    await db.from('forge_admin').insert({ id: 'admin', password_hash });
    const result = await db.from('forge_admin').select('password_hash').eq('id', 'admin').single();
    admin = result.data;
  }
  if (!admin || !(await compare(password, admin.password_hash))) return { ok: false, error: 'Incorrect password.' };
  const session = await adminSession();
  await session.update({ admin: true, authenticatedAt: Date.now() });
  await db.from('forge_admin_profile').upsert({ id: 'admin' }, { onConflict: 'id', ignoreDuplicates: true });
  return { ok: true, error: null };
}
export async function providerEnabled(id: ProviderId) {
  const db = await adminDb();
  const { data, error } = await db.from('forge_integrations').select('enabled').eq('id', id).maybeSingle();
  if (error) throw new Error('Integration settings unavailable.');
  return data?.enabled ?? PROVIDERS.find(p => p.id === id)?.defaultEnabled ?? false;
}
export async function safeFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Credentials rejected or expired.' : response.status === 429 ? 'Provider rate limit reached. Try later.' : 'Provider unavailable.');
  return response.json();
}