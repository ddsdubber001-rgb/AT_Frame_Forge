import { describe, expect, it, vi, afterEach } from 'vitest';
import { ADMIN_COOKIE_OPTIONS } from '../lib/admin-policy';
import { providerCredential, requireAdmin, adminSession } from '../lib/admin.server';

const mocks = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('@tanstack/react-start/server', () => ({ useSession: mocks.useSession, getRequestIP: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('Admin cookie and authorization', () => {
  it('permits embedded requests without exposing the cookie to JavaScript', () => {
    expect(ADMIN_COOKIE_OPTIONS).toMatchObject({ sameSite: 'none', partitioned: true, secure: true, httpOnly: true });
  });
  it('creates encrypted sessions with the embedded-safe cookie policy', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-only-session-secret-not-a-real-credential');
    mocks.useSession.mockResolvedValue({ data: {} });
    await adminSession();
    expect(mocks.useSession.mock.calls[0]?.[0]).toMatchObject({ name: 'forge-admin', maxAge: 3600, cookie: ADMIN_COOKIE_OPTIONS });
  });
  it('rejects an unauthenticated request', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-only-session-secret-not-a-real-credential');
    mocks.useSession.mockResolvedValue({ data: {} });
    await expect(requireAdmin()).rejects.toThrow('Admin authentication required.');
  });
  it('rejects expired sessions', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-only-session-secret-not-a-real-credential');
    mocks.useSession.mockResolvedValue({ data: { admin: true, authenticatedAt: Date.now() - 3601000 } });
    await expect(requireAdmin()).rejects.toThrow('Admin authentication required.');
  });
});
describe('Configured TMDB credentials', () => {
  it('uses the already-configured TMDB_READ_ACCESS_TOKEN name', () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('TMDB_API_KEY', 'test-key');
    expect(providerCredential('tmdb')).toBe('test-token');
  });
  it('keeps TMDB_API_KEY as a fallback', () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '');
    vi.stubEnv('TMDB_API_KEY', 'test-key');
    expect(providerCredential('tmdb')).toBe('test-key');
  });
});