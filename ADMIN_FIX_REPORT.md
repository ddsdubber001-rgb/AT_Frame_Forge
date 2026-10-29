# Admin authentication and integration repair — October 29, 2026

## Root cause and evidence

The encrypted admin cookie used `SameSite=Strict`. In the cross-site embedded preview, login succeeded but the browser did not send that cookie on the next settings request. The page set its authenticated flag before settings loaded, leaving the display-name field visible and providers empty when the request failed.

Reproduced the exact reported screen in a cross-site HTTPS browser equivalent, forwarding only cookies actually sent by the browser to the local running app: “Action unavailable. Refresh or sign in again.” The RPC transport returned HTTP 200 but carried an authentication exception, not successful settings data. Top-level localhost login and settings worked before repair, isolating the failure to embedded session transport rather than a missing database/function or incorrect password. The existing database and admin password were not changed.

An independent metadata configuration mismatch was found: hosting contains `TMDB_READ_ACCESS_TOKEN`, while status checks, connection validation and searches read only `TMDB_API_KEY`.

## Changes

- `src/lib/admin-policy.ts`: shared Secure, HttpOnly, SameSite=None, Partitioned cookie policy.
- `src/lib/admin.server.ts`: apply cookie policy; server-only provider credential resolver supports the existing TMDB token name with legacy API-key fallback.
- `src/lib/admin.functions.ts`: check settings-read failures, load providers/profile together, use the same credential resolver for status and validation, report missing session configuration safely.
- `src/lib/tmdb.functions.ts`: use the same resolver for metadata search/details.
- `src/routes/admin.tsx`: only show authenticated dashboard after settings load; clear protected state on session failure/logout; show confirmed profile-save success and actionable error states; document both TMDB secret names.
- `src/test/admin-session.test.ts`: regression tests for embedded-cookie policy, encrypted session configuration, unauthorized/expired session denial and credential-name compatibility.
- `AGENTS.md`, `CONFIGURATION.md`, `roadmap.md`: updated security/configuration rules and remaining blockers.

CSRF middleware remains enabled. No keys, passwords or cookie values were logged or returned. No credentials are stored in browser storage. No UI redesign or poster changes were made.

## Actual test results

| Test | Result | Evidence |
| --- | --- | --- |
| Configured correct password | PASS | Real browser login against existing admin hash; embedded dashboard loaded all four providers |
| Incorrect password | NOT TESTED conclusively | Submitted a wrong password, but existing durable limiter returned “Too many attempts. Wait 15 minutes.” It was denied; bcrypt mismatch response was not exercised in this run. Limiter was not reset or bypassed |
| Normal navigation | PASS | Library → Admin retained authenticated access |
| Refresh | PASS | Parent-page reload retained access and saved display name |
| Logout | PASS | Sign out followed by reload showed login form, no protected settings |
| Display name save | PASS | Changed name, confirmed save message/readback after refresh; restored original name and confirmed save |
| Integration list/status | PASS | AniList, Jikan, TMDB and OMDb rendered; TMDB reported configured |
| TMDB connection | PASS | Actual configured token returned “Connection verified.” |
| TMDB metadata | PASS | Real Interstellar search returned results without error |
| Unauthorized direct requests | PASS | Settings, profile mutation, provider toggle and connection test all rejected without admin session |
| Credential add/update/remove in app | NOT TESTED / unavailable | No application-accessible hosting secret-store write integration exists |
| Live OMDb validation | NOT TESTED | OMDB_API_KEY is not configured |
| Browser page errors / failed HTTP requests | PASS | Zero page exceptions or HTTP responses ≥400 in repaired embedded flow |
| Regression tests | PASS | 25 tests passed across admin-session, forge-rules and app-routing suites |
| Automatic build | PASS | Harness reported build OK after main repair |

Embedded verification used a synthetic HTTPS parent/app pair mapped to the actual localhost server, not the hosted Lovable editor itself. Screenshots confirmed the unchanged dashboard with four integrations and profile success. Browser restrictions that block all cookies may still require allowing site cookies. Partitioned sessions are intentionally isolated by embedding site: a separate top-level tab may require its own login.

## Configuration still required

No new configuration is required for admin login or TMDB: existing admin secrets and TMDB token were preserved.

This hosting runtime cannot modify the hosting secret store. Authorized credential add/update/remove must use **Lovable project Settings → Secrets**; the dashboard honestly reports configuration and validates connections only. Do not grant public database access or expose hosting-management credentials to work around this limitation.

- TMDB: update `TMDB_READ_ACCESS_TOKEN` (preferred) or `TMDB_API_KEY`; remove all configured alternatives if disabling the credential entirely.
- OMDb: add `OMDB_API_KEY`, then enable OMDb and use Test connection.
- Refresh Admin after secret changes. Publish the app to apply changed secrets to the published app; no deployment was performed here.
- Keep `ADMIN_SESSION_SECRET` unchanged unless intentionally invalidating sessions. The configured password was not changed.

The password-only rejection check should be repeated after the normal fifteen-minute limiter window expires; this repair does not remove or weaken that limiter.