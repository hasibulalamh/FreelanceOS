# Architecture

FreelanceOS is a **modular monolith**: one Next.js app, clear module
boundaries, no premature infrastructure. A single maintainer should be able
to hold the whole system in their head.

## Layers

```
app/(dashboard)/*     → pages (server components; DB reads direct)
app/api/*             → route handlers (auth, validation, thin orchestration)
services/*            → business logic (portfolio sync, platforms, AI engine)
lib/*                 → cross-cutting: prisma client, auth, config, api envelope
validators/*          → zod schemas shared by API routes
prisma/               → schema + migrations + seeds
components/           → UI primitives (server-safe) + client islands
```

Rules of thumb:

1. **Pages never import secrets.** `lib/config.js` is `server-only`; client
   components receive data via props from server components.
2. **Route handlers stay thin.** They authenticate (`lib/auth.js`), rate-limit
   where sensitive, validate via `validators/`, then delegate to a service.
3. **Services never touch HTTP concerns.** They take plain inputs and return
   plain result objects; the API layer maps those to status codes.
4. **Pure logic is separated for tests.** Example: portfolio normalization is
   a pure module (`normalize.js`) tested by `tests/unit/`.

## Consistent API envelope

Every route returns:

```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "message": "...", "details": { ... } } }
```

Helpers: `ok()` / `fail()` in `lib/api.js`. Client code can rely on this shape.

## Auth

NextAuth v4, JWT session strategy (required for the credentials provider).
The `Account` table matches the adapter's expected field names, so Google/
GitHub OAuth works through `@next-auth/prisma-adapter` with zero custom code.
Providers are registered only when their env vars exist.

Route protection: edge middleware redirects cookie-less requests to `/login`
(UX layer) and the `(dashboard)` layout re-checks the session server-side
(authoritative layer).

## Planned layers (not yet built)

- **AI engine** (`services/ai/`, phase 8: client + prompt registry + first
  module shipped): Gemini calls behind a zero-dependency client
  (`generateStructured`), versioned prompts, Zod-validated structured
  outputs, audited `AiGeneration` rows. AI proposes; the app validates and
  writes. AI never gets DB/marketplace/browser access — new modules plug
  into the existing prompt registry and generation service.
- **Queues** (Redis + BullMQ): AI generation, research processing, analytics
  aggregation. The in-memory rate limiter is replaced by a Redis limiter then.
- **Storage**: R2 signed-URL uploads; credentials stay server-side.
- **Extension** (MV3): context capture on permitted pages → FreelanceOS API →
  preview → explicit user approval → insertion only where permitted.
