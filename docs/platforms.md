# Platforms & Capability Model

FreelanceOS is **permission-aware**: it automates only what a marketplace
officially permits. Claims about platforms are data, not copy.

## Source of truth

`services/platforms/catalog.js` defines, per platform, one entry per
capability:

| Capability | Meaning |
| ---------- | ------- |
| `PROFILE_SYNC` | read the marketplace profile via official means |
| `JOB_IMPORT` | bring job/brief data into FreelanceOS |
| `GIG_MANAGEMENT` | prepare/manage gig-like listings |
| `PROPOSAL_MANAGEMENT` | prepare proposals/offers |
| `KEYWORD_RESEARCH` | internal AI analysis (always SUPPORTED — no marketplace data needed) |
| `BROWSER_ASSISTANCE` | extension helps on the site, within terms |
| `OFFICIAL_API` | an official, documented public API exists |
| `OAUTH` | an official consumer OAuth flow exists |
| `AUTOMATIC_SUBMISSION` | submitting without a human click |

## Statuses

- `SUPPORTED` — works/possible today through official means
- `USER_AUTH_REQUIRED` — official mechanism, needs the user's OAuth consent
- `PLATFORM_APPROVAL_REQUIRED` — official mechanism, platform must approve an app first
- `MANUAL_ONLY` — FreelanceOS prepares, the user pastes/submits
- `NOT_SUPPORTED` — the platform offers no official mechanism

Every entry carries a `notes` string explaining **why**. Tests
(`tests/unit/platform-catalog.test.js`) enforce: all 9 capabilities defined,
valid statuses, notes present, and `AUTOMATIC_SUBMISSION = NOT_SUPPORTED`
everywhere. Marketplaces without a public API (Fiverr, PeoplePerHour, Guru,
Contra) cannot claim `OFFICIAL_API` or `OAUTH` — the test suite fails loudly
if someone edits the catalog without evidence.

## Current truth (as of this build)

| Platform | Official API | OAuth | Job import | Everything else |
| -------- | ------------ | ----- | ---------- | --------------- |
| Fiverr | ✗ none | ✗ | manual | manual only |
| Upwork | approval required | approval required | user OAuth | manual |
| Freelancer | ✓ public API | ✓ | user OAuth | manual |
| PeoplePerHour | ✗ none | ✗ | manual | manual only |
| Guru | ✗ none | ✗ | manual | manual only |
| Contra | ✗ none | ✗ | manual | manual only |

## Freelancer adapter (Phase 7)

Freelancer.com is the only marketplace in the catalog with a self-service
official API + OAuth flow, so it is the first (and currently only) registered
adapter. Everything below talks to **official endpoints only** — no scraping.

### Configuration

Set `FREELANCER_CLIENT_ID` / `FREELANCER_CLIENT_SECRET` from an application
created at developers.freelancer.com. Register this redirect URI there:

```
{NEXTAUTH_URL}/api/platforms/freelancer/callback
```

`FREELANCER_ACCOUNTS_BASE_URL` / `FREELANCER_API_BASE_URL` override the
production endpoints for the sandbox or the test mock. When the client
credentials are unset the adapter reports "not configured" (HTTP 503) instead
of pretending to work.

### What is implemented

- **Connect** — `GET /api/platforms/freelancer/connect` starts the OAuth 2
  authorization-code flow (`response_type=code`, `scope=basic`,
  `prompt=select_account consent`) with a CSRF `state` stored in a 10-minute
  httpOnly cookie. The callback validates `state`, exchanges the code at
  `accounts.freelancer.com/oauth/token`, fetches `users/0.1/self`, and stores
  the connection.
- **Encrypted tokens at rest** — access/refresh tokens are AES-256-GCM
  encrypted (`lib/crypto.js`, `v1:<iv>:<tag>:<data>` format, key derived from
  `CREDENTIAL_ENCRYPTION_KEY` via scrypt) before they ever touch the database.
  Plaintext tokens never appear in logs, API responses, or the DB.
- **Token lifecycle** — `getValidAccessToken` proactively refreshes 60 seconds
  before expiry; a failed refresh marks the account disconnected rather than
  retrying with a dead token.
- **Disconnect** — `DELETE /api/platforms/freelancer/connection` destroys all
  stored tokens (NULLs them) and logs the activity.
- **Profile fetch** — `GET /api/platforms/freelancer/profile` reads the
  connected freelancer's identity via `users/0.1/self` (projection only).
- **Job search** — `GET /api/platforms/freelancer/jobs?query=…` searches
  `projects/0.1/projects` with the user's token. Results are returned,
  **not persisted** — job import/persistence is a later phase.

### Capability enforcement (the registry)

`services/platforms/registry.js` is the single gate for every platform
operation: `authorizePlatformOperation(slug, capability, userId)` reads the
**DB-seeded capability status** and enforces it —

- `SUPPORTED` → allowed.
- `USER_AUTH_REQUIRED` / `PLATFORM_APPROVAL_REQUIRED` → allowed only with a
  registered adapter **and** a CONNECTED account for that user.
- `MANUAL_ONLY` / `NOT_SUPPORTED` → HTTP 403 with the catalog's honest
  explanation, no matter what code asks for it.

Unknown platform slugs 404. This is what makes the capability table above
*enforced policy* instead of documentation.

### Testing

`tests/mock/freelancer-api.mjs` stands in for both `accounts.freelancer.com`
and the REST API (ports 4402); `tests/unit/freelancer-oauth.test.js` covers
authorize-URL construction, code exchange, refresh, envelope parsing, and
error shapes. Real-marketplace E2E requires real developer credentials, which
can only be created by the account owner — by design, no fake credentials
exist in the repo.

## How the UI uses it

`GET /api/platforms` (session required) returns the DB-seeded catalog plus the
user's account status per platform. The Platforms page renders capability
cards with their notes — there is no hardcoded "API available" copy anywhere.

## Non-goals (hard requirements from the spec)

- No scraping of marketplaces.
- No credential/cookie extraction, CAPTCHA or anti-bot bypass.
- No mass messaging/applications or background submissions.
- The final Create / Publish / Submit action is always the user's click.
