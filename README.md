# FreelanceOS

AI-powered freelance profile, SEO & proposal automation platform — a personal
command center that keeps your portfolio as the single source of truth and
builds platform-specific content on top of it.

> Live at `app.hasibulalam.com` (deployment pending). Portfolio source of
> truth: `hasibulalam.com`.

## What it does

FreelanceOS synchronizes your professional data from your portfolio API, then
helps you research keywords, analyze jobs, generate platform-specific gigs and
proposals, and track your freelance pipeline — with a hard rule: **the final
Create / Publish / Submit action always stays human-controlled.**

The system is deliberately *capability-honest*: it only claims to automate what
a marketplace officially permits (see `services/platforms/catalog.js`).

## Tech stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Frontend  | Next.js 16 (App Router), React 19, Tailwind v4     |
| Language  | JavaScript (ESM) — no TypeScript by design         |
| Database  | PostgreSQL 16                                      |
| ORM       | Prisma 6 (stable line; v7/8 evaluated, deferred)   |
| Auth      | NextAuth v4 — credentials + Google/GitHub OAuth    |
| Tests     | Vitest                                             |
| AI        | Gemini API (REST `generateContent`, structured output) |
| Planned   | Redis + BullMQ, Cloudflare R2, MV3 extension       |

## Quickstart

```bash
pnpm install

# local database (Docker; system Postgres works too)
docker run -d --name freelanceos-pg \
  -e POSTGRES_USER=freelanceos -e POSTGRES_PASSWORD=freelanceos_dev \
  -e POSTGRES_DB=freelanceos -p 5433:5432 postgres:16-alpine

cp .env.example .env          # then fill DATABASE_URL + AUTH_SECRET
# optional: CREDENTIAL_ENCRYPTION_KEY (openssl rand -hex 32) encrypts
# marketplace OAuth tokens at rest
# optional: GEMINI_API_KEY (aistudio.google.com/apikey) enables AI Studio
pnpm exec prisma migrate dev  # apply schema
pnpm exec prisma db seed      # platform capability catalog
pnpm dev                      # http://localhost:3000
```

First visit to `/login` shows the **initial setup** form: the first account
created becomes the platform OWNER; further registrations are rejected.

### Scripts

| Command                     | Purpose                          |
| --------------------------- | -------------------------------- |
| `pnpm dev`                  | dev server                       |
| `pnpm build` / `pnpm start` | production build / serve         |
| `pnpm lint`                 | ESLint (next/core-web-vitals +)  |
| `pnpm test`                 | vitest unit tests                |
| `pnpm scan:secrets`         | full-tree secret scan (CI-style) |
| `pnpm exec prisma migrate dev` | apply schema changes          |
| `pnpm exec prisma db seed`  | seed platform catalog            |

## Project structure

```
app/
  (dashboard)/          protected app (sidebar shell, session-gated)
    dashboard/          DB-backed overview (no fabricated metrics)
    profile/            portfolio-synced master profile + manual editing
    platforms/          capability-honest platform cards
    [...slug]/          honest "planned module" placeholders
  api/
    auth/[...nextauth]/ NextAuth handlers
    auth/register/      owner registration (single-account policy)
    portfolio/sync/     triggers portfolio synchronization
    platforms/          platform catalog + user account status
    ai/                 AI modules (keyword research; more per phase)
components/             shared UI (client islands + server-safe primitives)
lib/                    prisma client, auth options, config, crypto, api envelope
services/
  portfolio/            portfolio sync: client → normalize → sync-service
  platforms/            capability catalog + registry + adapters
  ai/                   Gemini client, versioned prompts, generation service
prisma/                 schema, migrations, seed
validators/             zod schemas
tests/                  vitest unit tests + portfolio API mock
docs/                   architecture, database, module documentation
```

## Core concepts

### Portfolio sync
`services/portfolio/sync-service.js` fetches 7 endpoints from the portfolio
API, normalizes them (`normalize.js` — pure, unit-tested), detects changes via
a SHA-256 payload hash, and replaces `PORTFOLIO`-sourced rows while preserving
`MANUAL` additions. Unset `PORTFOLIO_API_URL` yields a graceful
"not configured" state — the app never fakes data.

### Manual editing semantics
`PATCH` endpoints distinguish "untouched" (absent key) from "cleared"
(empty string → `null` on nullable columns), reject unknown keys, and
preserve `MANUAL` rows across portfolio syncs. Identity fields edited
manually become **overrides** — portfolio sync skips them until released.
See `docs/profile-management.md`.

### Platform capabilities
`services/platforms/catalog.js` is the single source of truth for what each
marketplace supports. `AUTOMATIC_SUBMISSION` is `NOT_SUPPORTED` on **every**
platform by policy. Tests guard the catalog against silent drift.

### Platform adapters
`services/platforms/registry.js` maps platform slugs to adapters and gates
every platform operation through the DB-seeded capability statuses — a
capability marked `MANUAL_ONLY` returns HTTP 403 no matter what asks for it.
Freelancer.com is the first adapter: official OAuth 2 (authorization code)
against `accounts.freelancer.com`, the `users/0.1/self` profile endpoint and
the `projects/0.1/projects` search endpoint, with tokens **encrypted at rest**
(AES-256-GCM via `CREDENTIAL_ENCRYPTION_KEY`). Connect/disconnect, profile
fetch and job search are live under `/api/platforms/freelancer/*`; job results
are returned, not yet persisted. See `docs/platforms.md`.

### AI engine (Gemini)
`services/ai/` wraps the Gemini REST API (`generateContent`) with a
zero-dependency client and zod-validated structured output
(`responseJsonSchema`). Prompts are **versioned** and every run — success or
failure — is stored as an audited `AiGeneration` row with model, prompt
version, and real token usage. The first module, **keyword research**,
analyzes only the user's own profile and is forbidden from inventing
metrics (no search volumes, no competition scores). See `docs/ai-engine.md`.

### Honest data rule
The dashboard, analytics and profile pages only render numbers that exist in
the database. Empty states carry CTAs; missing features are labeled with the
phase that delivers them.

## Roadmap (build order)

- [x] Phase 1 — Foundation (Next.js, ESLint, Prisma, Postgres)
- [x] Phase 2 — Initial schema (auth, profile/portfolio, platforms)
- [x] Phase 3 — Authentication
- [x] Phase 4 — Dashboard shell
- [x] Phase 5 — Portfolio sync
- [x] Phase 6 — Profile management (identity editing, manual skills/services/certifications)
- [x] Phase 7 — Platform adapters (Freelancer.com official API + OAuth, encrypted tokens)
- [x] Phase 8 — AI engine: Gemini client, versioned prompts, keyword research
- [ ] Phase 9+ — Profile optimizer, job analyzer, portfolio matcher,
      proposals, gig builder (AI modules on the same engine)
- [ ] Phase 17+ — Client CRM, analytics, Redis/BullMQ, R2, extension

See `docs/` for module-level documentation.

## Security notes

- Marketplace passwords/cookies are **never** stored; no credential fields exist.
- **Secret scanning is enforced at commit time**: a pre-commit hook
  (`githooks/pre-commit`, wired via `pnpm prepare` → `core.hooksPath`) runs
  `scripts/scan-secrets.mjs` over staged files and blocks the commit on any
  known secret shape (private keys, secret-env assignments, high-entropy
  assignments, credential-bearing URLs, provider tokens). Scan the whole
  tree anytime with `pnpm scan:secrets`.
- Third-party OAuth tokens are stored **encrypted at rest** (AES-256-GCM) or
  not at all.
- No scraping, CAPTCHA/anti-bot bypass, or mass actions — by design and by test.
- AI output is schema-validated, stored as drafts, and never applied to
  profile/platform data without an explicit future apply action; AI prompts
  forbid invented metrics.
- Secrets live only in env vars; `.env*` is gitignored; API routes authorize
  via session and rate-limit sensitive endpoints.
