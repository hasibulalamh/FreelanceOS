# Portfolio Sync

The portfolio at `hasibulalam.com` is the **source of truth** for professional
data. FreelanceOS never duplicates it by hand — it synchronizes.

## Flow

```
Portfolio API  →  fetch (client.js)  →  normalize (normalize.js)
              →  change detection (SHA-256)  →  write (transaction)
              →  profile.syncStatus = SYNCED  →  activity log
```

## Components

| File | Responsibility |
| ---- | -------------- |
| `services/portfolio/client.js` | HTTP client. Unwraps the portfolio envelope `{ data, message, errors }`, 10s timeout, typed `PortfolioApiError` for timeouts/HTTP/JSON failures. |
| `services/portfolio/normalize.js` | **Pure** mapping to DB shapes. Field names verified against the real backend resources (`portfolio-backend/app/Http/Resources/*`). Unit-tested. |
| `services/portfolio/sync-service.js` | Orchestration: parallel fetch of 7 endpoints → normalize → hash → transactional write. |
| `app/api/portfolio/sync/route.js` | POST endpoint. Auth required, 4 requests / 5 min / user. |
| `components/portfolio-sync-button.js` | Client button: loading → result/unchanged/error states + retry. |

## Endpoints consumed

`/api/hero`, `/api/about`, `/api/contact-info`, `/api/skills`,
`/api/projects`, `/api/timeline`, `/api/testimonials`

Mapping highlights (verified against the Laravel resources):

- `hero` → `fullName` (name), `professionalTitle` (heading), `summary` (subheading)
- `about` → `bio` (bio_paragraph_1 + 2), `avatarUrl` (image_path)
- `skills` → flat list; category = SkillCategory name
- `timeline` → split by `type` into `experiences` / `education`; years stay in
  the description (the source stores plain year strings, not dates)
- `projects` → tags → `technologies`, `github_url` → `repoUrl`, `live_url` →
  `liveUrl`, `is_featured` → `featured`

## Semantics

- **Change detection**: normalized payload → recursive key-sorted JSON →
  SHA-256. Identical hash ⇒ `UNCHANGED`, no writes.
- **Replace vs preserve**: rows with `source=PORTFOLIO` are deleted and
  recreated inside one transaction; `source=MANUAL` rows are untouched.
- **Failure handling**: any error sets `syncStatus=FAILED` and returns the
  message — previously synced data is never wiped. `PORTFOLIO_API_URL` unset
  ⇒ `NOT_CONFIGURED` result instead of a crash.
- **Services & certifications** have no portfolio endpoint; they are manual
  entries (labelled as such in the UI).

## Testing

- Unit: `tests/unit/portfolio-normalizer.test.js` (11 tests — mapping, edge
  cases, hash stability).
- E2E: `tests/mock/portfolio-api.mjs` serves realistic payloads on :4401.
  Verified sequence: SYNCED → UNCHANGED → mutated payload → SYNCED,
  unauthenticated 401, DB rows inspected via psql.
