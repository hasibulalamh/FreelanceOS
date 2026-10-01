# Database

PostgreSQL via Prisma 6. Schema: `prisma/schema.prisma`; migrations are
committed under `prisma/migrations/`. Apply with `pnpm exec prisma migrate dev`.

## Current models (phase 1)

### Auth
- `users` — one account in practice; the first registration becomes OWNER and
  further registrations are rejected at the API layer. `passwordHash` is a
  bcrypt hash (cost 12), nullable for future OAuth-only accounts.
- `accounts` — OAuth provider links. Field names intentionally match
  NextAuth v4's `PrismaAdapter` contract (`type`, `refresh_token`,
  `access_token`, `expires_at` as Int) — zero custom mapping code.
- `sessions`, `verification_tokens` — Auth.js-compatible.

### Profile & portfolio (synced from the portfolio API)
- `profiles` — 1:1 with user. Sync state: `syncStatus`
  (NEVER_SYNCED/PENDING/SYNCING/SYNCED/FAILED), `lastSyncedAt`,
  `lastSyncHash` (SHA-256 of the normalized payload — cheap change
  detection).
- `skills`, `services`, `experiences`, `education`, `certifications`,
  `projects`, `testimonials` — each carries `source`:
  `PORTFOLIO` (replaced on every sync) or `MANUAL` (preserved across syncs).
  `projects.technologies` is a `String[]` — denormalized on purpose.

### Platforms
- `platforms` — the six supported marketplaces (seeded).
- `platform_capabilities` — one row per (platform, capability) with
  `status` + `notes`. The UI derives ALL platform claims from these rows.
- `platform_accounts` — a user's account on a marketplace. Official-OAuth
  token columns (phase 7) are stored **encrypted at rest** (AES-256-GCM,
  `lib/crypto.js`); plaintext never reaches the DB or logs.
- `platform_profiles` — optimization state of the marketplace-side profile.

### Auditing
- `activity_logs` — append-only event feed (auth events, portfolio syncs,
  AI generations). Index on `(userId, createdAt)`.

### AI (phase 8)
- `ai_generations` — one row per AI attempt (success **and** failure):
  `kind`, `status` (COMPLETED/FAILED), exact `model` + `promptVersion`,
  validated `input`/`output` JSON, `error`, real token usage, and
  `latencyMs`. Indexes on `(userId, createdAt)` and `(userId, kind)`.
  See `docs/ai-engine.md`.

## Conventions

- Table names are snake_case (`@@map`), model names PascalCase.
- Cascading deletes follow ownership (user → profile → children).
- Every non-unique FK has an index.
- Seeding: `pnpm exec prisma db seed` runs `prisma/seed.js` (idempotent
  upserts of the platform catalog; never deletes).

## Local development

Docker Postgres on port 5433 (see README quickstart). The connection string
lives in `.env` (`DATABASE_URL`) — never committed.
