# AT Frame Forge — run and deployment

## Run
```sh
bun install
bun run dev
bun run test
bun run build
```
Lovable performs its production build automatically. Publish through Lovable after reviewing the preview; this update does not publish the app. GitHub can sync source. GitHub Pages alone cannot host password sessions, secure metadata calls or durable admin settings: use the full app on Lovable or a compatible server host with a configured database. Never expose private keys to make a static deployment appear functional.

## Admin credential setup
The initial credential was stored through encrypted hosting secrets. First login initializes a cost-12 bcrypt salted hash in a service-only table. Admin identity has a separate display-name profile; it is not a public user account. No public registration was added.

Every settings/profile/test operation validates an encrypted HttpOnly, Secure, SameSite=None, Partitioned cookie with a one-hour lifetime. Partitioning supports cross-site editor previews without sharing a session between embedding sites; browsers that block all cookies still require cookies to be allowed. CSRF middleware remains enabled. An atomic durable counter limits attempts to five per IP bucket every fifteen minutes. Unknown IPs share a bucket. Additional production WAF limits are advisable against distributed attacks. There is no password-change/recovery interface in this version.

After a successful first login, remove `ADMIN_INITIAL_PASSWORD` from hosting secrets. Keep `ADMIN_SESSION_SECRET`; rotating it invalidates all sessions. Never publish the password or its hash.

## Exact hosting environment names
| Name | Purpose |
| --- | --- |
| `ADMIN_INITIAL_PASSWORD` | Initial credential bootstrap only |
| `ADMIN_SESSION_SECRET` | Strong session encryption secret, securely generated during setup |
| `TMDB_API_KEY` | TMDB v3 API key or API read-access token |
| `TMDB_READ_ACCESS_TOKEN` | Preferred TMDB read-access token; the existing configured name is supported by both connection tests and metadata search |
| `OMDB_API_KEY` | Optional OMDb provider key |

Lovable Cloud supplies database environment configuration automatically. `.env.example` contains placeholders only. Never put private values in `VITE_` variables, GitHub files, URLs delivered to the browser or browser storage.

The application runtime cannot write Lovable's hosting secret store. To **add/update/remove credentials**, open Lovable project **Settings → Secrets**, save/replace/delete the exact provider name, then refresh `/admin`. The dashboard manages enable flags and tests connections; it does not accept or falsely claim to save keys. It shows only configured/not configured and a fixed opaque mask, never prefixes, suffixes or lengths.

- **AniList:** public GraphQL anime metadata needs no key for this usage.
- **Jikan:** public anime metadata needs no key; rate limits apply.
- **TMDB:** obtain API access from your TMDB account's API settings at themoviedb.org. Review attribution and usage requirements. IMDb identifiers from TMDB are retained; ratings remain explicitly labeled TMDB.
- **OMDb:** obtain your own key at https://www.omdbapi.com/apikey.aspx. The official site describes it as a third-party REST service with user-contributed metadata and IMDb identifiers, **not endorsed by or affiliated with IMDb**. Its content is licensed CC BY-NC 4.0; verify your usage is permitted, especially commercial use, and retain appropriate attribution. The separate patron Poster API is not used. The adapter labels metadata `OMDb` and relevant ratings `IMDb (via OMDb)`. Disabled by default; missing keys do not stop other providers. No scraping is performed.
- **Future providers:** extend the reviewed provider registry, validation schema, server adapter and allowed settings IDs together. Arbitrary endpoints are intentionally not accepted.

## Export and storage
All four templates use a shared renderer in preview, thumbnails, batch and downloads. The actual 640×640 uploaded ANIME TAMILAN image is a circular editable layer, injected into legacy projects without rewriting their saved design. At default 4K size the logo remains within source resolution; very large manual enlargement cannot create new detail.

Reference text auto-fits; extreme text can shrink or truncate rather than overlap. Missing dependent metadata is hidden. Poster palettes remain independent of the electric-blue interface. Export uses only poster layers, not editor handles. Different export/canvas aspect ratios contain the exact composition with centred margins rather than stretching; choose a matching canvas shape for a full-frame export. Existing projects remain saved in IndexedDB; no online backup or project-login migration was introduced.

See `UPDATE_REPORT.md` for performed checks and limitations.