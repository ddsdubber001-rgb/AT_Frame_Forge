import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { LockKeyhole, LogOut, RefreshCw, ShieldCheck, Save } from 'lucide-react';
import { Brand } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { adminLogin, adminLogout, adminSettings, adminState, saveAdminProfile, setIntegration, testIntegration } from '@/lib/admin.functions';
import type { ProviderId } from '@/lib/admin-policy';

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [
    { title: 'Admin Integrations — AT Frame Forge' },
    { name: 'description', content: 'Protected metadata integration settings for AT Frame Forge.' },
    { property: 'og:title', content: 'Admin Integrations — AT Frame Forge' },
    { property: 'og:description', content: 'Protected metadata integration settings for AT Frame Forge.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }), component: Admin,
});
type Settings = Awaited<ReturnType<typeof adminSettings>>;
function Admin() {
  const login = useServerFn(adminLogin), logout = useServerFn(adminLogout), state = useServerFn(adminState);
  const read = useServerFn(adminSettings), toggle = useServerFn(setIntegration), test = useServerFn(testIntegration), saveProfile = useServerFn(saveAdminProfile);
  const [authenticated, setAuthenticated] = useState(false), [ready, setReady] = useState(false);
  const [password, setPassword] = useState(''), [settings, setSettings] = useState<Settings | null>(null);
  const [displayName, setDisplayName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [statuses, setStatuses] = useState<Partial<Record<ProviderId,string>>>({});
  async function refresh() { const s = await read(); setSettings(s); setDisplayName(s.displayName); setAuthenticated(true); }
  useEffect(() => { state().then(async s => { if (s.error) setError(s.error); if (s.authenticated) await refresh(); }).catch(() => setError('Admin settings could not load. Check hosting configuration and try signing in again.')).finally(() => setReady(true)); }, []);
  async function action(fn: () => Promise<unknown>) { setBusy(true); setError(''); setNotice(''); try { await fn(); } catch {
    try { const s = await state(); if (!s.authenticated) { setAuthenticated(false); setSettings(null); setError(s.error ?? 'Your admin session is unavailable or expired. Sign in again. Allow cookies for this site if the problem continues.'); } else setError('The operation failed. Check the admin database configuration, then retry.'); }
    catch { setError('The admin service could not be reached. Please try again.'); }
  } finally { setBusy(false); } }
  return <div className="min-h-screen bg-background">
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5"><Brand /><Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Library</Link></header>
    <main className="mx-auto max-w-5xl px-4 pb-12">
      <div className="mb-8 flex items-center gap-3 border-b border-border pb-5"><ShieldCheck className="h-7 w-7 text-primary" /><h1 className="font-display text-2xl font-bold">Admin dashboard</h1>{authenticated && <Button variant="outline" disabled={busy} className="ml-auto" onClick={() => action(async () => { await logout(); setAuthenticated(false); setSettings(null); setDisplayName(''); setStatuses({}); })}><LogOut />Sign out</Button>}</div>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mb-4 text-sm text-primary">{notice}</p>}
      {!ready ? <p className="text-muted-foreground">Checking access…</p> : !authenticated ? <form className="mx-auto max-w-sm space-y-4 py-12" onSubmit={e => { e.preventDefault(); action(async () => { const r = await login({ data: { password } }); setPassword(''); if (!r.ok) { setError(r.error ?? 'Sign-in failed.'); return; } await refresh(); }); }}>
        <LockKeyhole className="h-8 w-8 text-primary" /><h2 className="text-xl font-semibold">Administrator access</h2>
        <label className="block"><span className="label-sm">Password</span><input className="field" aria-label="Admin password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Verifying…' : 'Sign in'}</Button>
      </form> : <>
        <form className="mb-8 flex max-w-lg flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); action(async () => { await saveProfile({ data: { displayName } }); await refresh(); setNotice('Admin profile saved.'); }); }}><label className="min-w-0 flex-1"><span className="label-sm">Admin display name</span><input className="field" required maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} /></label><Button type="submit" variant="outline" disabled={busy}><Save />Save profile</Button></form>
        <div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold">Metadata integrations</h2><Button variant="ghost" disabled={busy} onClick={() => action(refresh)}><RefreshCw />Refresh</Button></div>
        <div className="grid gap-4 md:grid-cols-2">{settings?.providers.map(p => <section key={p.id} className="rounded-lg border border-border bg-panel p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{p.name}</h3><label className="flex items-center gap-2 text-sm"><input aria-label={`Enable ${p.name}`} type="checkbox" checked={p.enabled} disabled={busy} onChange={e => action(async () => { await toggle({ data: { id: p.id, enabled: e.target.checked } }); await refresh(); })} className="accent-primary" />Enabled</label></div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
          <p className="mt-4 text-sm text-foreground">{p.secret ? (p.configured ? 'Credential configured · ••••••••' : 'Credential not configured') : 'Public API · no credential needed'}</p>
          {p.secret && <div className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground"><p>To add or update: open Lovable project Settings → Secrets and save <code className="text-primary">{p.id === 'tmdb' ? 'TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY' : p.secret}</code>. To remove: delete the configured secret there. Then refresh here.</p><p className="mt-2">Hosting secrets cannot be written by this dashboard. No credential has been saved by this page.</p></div>}
          <Button variant="outline" className="mt-4" disabled={busy} onClick={() => action(async () => { const r = await test({ data: { id: p.id } }); setStatuses(s => ({ ...s, [p.id]: r.message })); })}><ShieldCheck />Test connection</Button>
          {statuses[p.id] && <p role="status" className="mt-3 text-xs text-muted-foreground">{statuses[p.id]}</p>}
        </section>)}</div>
      </>}
    </main>
  </div>;
}