# OMDb connection investigation — 2026-11-01 UTC

## Root cause and actual response

The server reads the correct `OMDB_API_KEY` hosting secret. The existing HTTPS endpoint and OMDb query-parameter format were correct; no secret-name mismatch or bearer-header issue was found.

The real minimal request was `https://www.omdbapi.com/?apikey=[REDACTED]&i=tt0111161`. OMDb returned **HTTP 401**, with the safe JSON fields `Response: "False"` and `Error: "Invalid API key!"`. No key or credential-bearing URL was logged or saved in the report.

The connection failure is a provider rejection of the configured credential. OMDb's response does **not** establish whether the key is invalid or merely unactivated, and provides no evidence of daily quota exhaustion. Activation status and remaining account quota cannot be independently confirmed from this response.

The application additionally discarded OMDb's JSON on non-2xx responses through the generic fetch helper, hiding the useful cause behind a generic failure. That error-handling defect is repaired. **A successful live OMDb connection is not verified and must not be claimed.**

## Changes

- `src/lib/omdb.server.ts`: shared server-only adapter; reads the provider resolver, sends the key only as OMDb's `apikey` parameter, parses JSON before classifying errors, returns safe messages, and allowlists metadata. It distinguishes explicit activation errors, invalid/ambiguous credentials, rate limits, unavailable provider, network/timeouts, no match, unexpected responses and missing backend configuration. Success requires a real 2xx response with `Response: "True"` and valid title/IMDb ID metadata.
- `src/lib/admin.functions.ts`: OMDb connection test uses the shared adapter and reports `Connection successful` only on actual success. Other providers' code remains unchanged.
- `src/lib/omdb.functions.ts`: metadata lookup uses the same response handling.
- `src/lib/metadata.ts`: OMDb errors are labeled OMDb, not TMDB.
- `src/test/omdb.test.ts`: 12 focused tests, including safe failure handling and strict success checks.
- `AGENTS.md`, `CONFIGURATION.md`, `roadmap.md`, `OMDB_FIX_REPORT.md`: architecture rule, troubleshooting guidance and honest verification status.

## Actual verification

| Check | Status | Evidence |
| --- | --- | --- |
| Minimal live OMDb request using configured secret | FAIL | HTTP 401; `Response: "False"`; `Error: "Invalid API key!"` |
| Signed-in dashboard's real OMDb connection | FAIL (provider), PASS (diagnosis) | Shows HTTP 401 rejection and safe activation/replacement guidance; no success claim |
| OMDb adapter tests | PASS | 12 tests passed for parameter format, configuration, credentials, activation, quota, 429, non-JSON outage, no match, malformed success and credential redaction |
| Existing admin/session and poster rules | PASS | 24 tests passed |
| App routing test | PASS | 1 test passed; 37 tests total across the four files |
| Actual admin sign-in and authenticated refresh | PASS | All four integrations loaded; dashboard remained authenticated after reload |
| Actual TMDB connection | PASS | Connection verified |
| Actual AniList connection | PASS | Connection verified |
| Actual Jikan connection | FAIL | Existing test failed; independent direct network request also failed. No Jikan code was changed |
| Browser runtime errors / failed browser requests | PASS | Zero observed during the dashboard test; OMDb rejection is returned as a handled test result |
| Automatic build | PASS | Observability reported `build OK` after the source changes |
| Independent OMDb account activation and remaining daily quota | NOT TESTED | Provider's 401 response cannot distinguish these; account-side confirmation required |
| Successful live OMDb metadata fetch with an activated valid key | NOT TESTED | Blocked by the configured credential's rejection |
| Live limit/outage/activation scenarios | NOT TESTED | Covered by simulated adapter tests only |

## Configuration still required

Open the activation email from OMDb and activate the key. If already activated, obtain/confirm a valid key from OMDb and replace **OMDB_API_KEY** in **Lovable project Settings → Secrets**. Refresh the dashboard and rerun Test connection. Do not paste the key into chat, frontend source or GitHub. The connection remains blocked until OMDb accepts the credential.