# Metadata search verification

Verified 2026-11-02 against the running application and real providers; no deployment performed.

## Actual provider results

| Provider | Status | HTTP | Safe observed outcome |
| --- | --- | --- | --- |
| TMDB | PASS | 200 | App search for The Shawshank Redemption returned 3 selectable movie results; selected ID resolved details including IMDb ID tt0111161. |
| AniList | PASS | 200 | Naruto search returned 8 matching anime records through the app. |
| OMDb | FAIL | 401 | Response False; provider classifies configured credential as invalid. Cannot distinguish invalid from unactivated credentials on this response. |
| Jikan | FAIL | None | Original browser request timed out. Direct HTTPS request timed out. DNS resolved two addresses; TCP connections to both timed out before TLS/HTTP. Updated app returns a safe network failure instead of Failed to fetch. |

## Confirmed causes and fixes

- AniList and Jikan originally fetched from the browser. Moved both through same-origin server functions and shared validated request handling. This removes browser cross-origin dependency; it does not claim to cure Jikan's separately reproduced network outage.
- TMDB already resolved the correct secret names. Replaced credential-length guessing with explicit TMDB_READ_ACCESS_TOKEN bearer handling and TMDB_API_KEY query handling, retaining legacy JWT token support. Shared search and dashboard tests now use one adapter; errors are safe and successful JSON structure is checked.
- Removed the all-provider settings gate from search orchestration. Each endpoint checks only its own provider, with local safe failure handling.
- Removed the generic TMDB configuration note that could confuse separate provider errors. The quoted TMDB: OMDb unavailable text was not found in current source or reproduced; no claim is made that its exact historical cause was established. Current simultaneous live searches show only correctly labelled OMDb/Jikan failures, while TMDB results remain selectable.
- OMDB_API_KEY already uses the correct HTTPS apikey request. Its actual credential remains rejected; no secret was changed. Shared OMDb response classification continues to preserve safe error details.
- Batch no longer silently applies the first interleaved provider match. It waits for explicit provider-qualified selection and preserves independent errors.
- TMDB details verify the returned ID against the selected ID. Missing sourced fields remain empty, with manual editing preserved.

## Tests actually performed

- PASS: 44 tests across metadata, provider request contracts, OMDb, admin sessions and poster rules.
- PASS: real app TMDB and AniList RPC searches; OMDb/Jikan failure classification.
- PASS: UI selectable movie result, exact title/year/date/genres/studio/rating/synopsis/IMDb ID populated from TMDB details.
- PASS: mixed Tamil/Japanese manual title saved and read back after refresh. Initial script checked before load; corrected check passed.
- PASS: batch image upload; no metadata auto-selected; export disabled before confirmation; AniList selection populated poster; export enabled after processing.
- PASS: browser page-error count zero in the editor verification. Browser-origin Jikan failed, while original browser-origin AniList returned HTTP 200.
- PASS: latest automatic build check reports build OK.
- NOT TESTED: successful live OMDb/Jikan retrieval, OMDb activation/quota beyond provider rejection, new exports or full admin login regression, published hosting behavior. No ZIP archive contents were inspected in this task.

## Files changed

- New: src/lib/provider-http.server.ts, src/lib/tmdb.server.ts, src/lib/anime.server.ts, src/lib/anime.functions.ts.
- Updated: src/lib/metadata.ts, src/lib/tmdb.functions.ts, src/lib/omdb.functions.ts, src/lib/admin.server.ts, src/lib/admin.functions.ts.
- Updated: src/components/editor/LeftPanels.tsx and src/routes/batch.tsx (search behavior only, no redesign).
- New tests: src/test/metadata.test.ts and src/test/provider-requests.test.ts.
- Documentation: AGENTS.md, roadmap.md and this report.

## Remaining setup / blockers

- OMDb: activate using provider email or replace OMDB_API_KEY in Lovable project Settings → Secrets, then retest. Activation is not verified.
- Jikan: network/provider reachability remains an external blocker; no HTTP status exists, so CORS, rate-limit status or JSON parsing failure cannot honestly be blamed.
- Dashboard credential writes remain unavailable through the app; existing hosting-secret workflow is unchanged.
- Image upload, original artwork, templates, logo and renderer/export modules were not redesigned or replaced.