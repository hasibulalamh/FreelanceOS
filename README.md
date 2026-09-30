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
| Planned   | Redis + BullMQ, Gemini API, Cloudflare R2, MV3 ext |

## Quickstart

```bash
pnpm install

# local database (Docker; system Postgres works too)
docker run -d --name freelanceos-pg \
  -e POSTGRES_USER=freelanceos -e POSTGRES_PASSWORD=freelanceos_dev \
  -e POSTGRES_DB=freelanceos -p 5433:5432 postgres:16-alpine

cp .env.example .env          # then fill DATABASE_URL + AUTH_SECRET
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
components/             shared UI (client islands + server-safe primitives)
lib/                    prisma client, auth options, config, api envelope
services/
  portfolio/            portfolio sync: client → normalize → sync-service
  platforms/            capability catalog (source of truth for the UI)
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
- [ ] Phase 7 — Platform adapters (official APIs where they exist)
- [ ] Phase 8+ — Gemini AI engine, keyword research, profile optimizer,
      job analyzer, portfolio matcher, proposals, gig builder
- [ ] Phase 17+ — Client CRM, analytics, Redis/BullMQ, R2, extension

See `docs/` for module-level documentation.

## Security notes

- Marketplace passwords/cookies are **never** stored; no credential fields exist.
- No scraping, CAPTCHA/anti-bot bypass, or mass actions — by design and by test.
- Secrets live only in env vars; `.env*` is gitignored; API routes authorize
  via session and rate-limit sensitive endpoints.
