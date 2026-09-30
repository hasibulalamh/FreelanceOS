# Profile Management (Phase 6)

The profile page combines **portfolio-synced data** with **manual entries**,
with explicit ownership rules so the two never fight.

## Data ownership

| Data | Source | Editable here? | Survives sync? |
| ---- | ------ | -------------- | -------------- |
| Identity (name, title, summary, bio, location, URLs, rate, languages) | Portfolio (hero/about/contact) | Yes — but a portfolio sync **overwrites** | ✗ (portfolio wins) |
| Skills | Portfolio + manual | Synced rows: read-only. Manual rows: full CRUD | Manual: ✓ / Synced: replaced |
| Services | Manual only (no portfolio endpoint) | Full CRUD | ✓ |
| Certifications | Manual only (no portfolio endpoint) | Full CRUD | ✓ |
| Experience, education, projects, testimonials | Portfolio | Not yet (planned manual overrides) | replaced on change |

The UI marks synced skill rows with a `synced` badge and "via sync" hint;
mutating them through the API returns `403` with an explanation.

## Update semantics (PATCH endpoints)

All profile APIs (`PATCH /api/profile`, and the collection routes) share the
same contract, implemented in `validators/profile.js`:

- **Absent key** → leave the stored value untouched.
- **Key present as `""`** → clear the field (write `null`) when the column is
  nullable. Non-nullable columns (e.g. `currency`) treat `""` as "untouched".
- **`languages`** → pass `[]` to clear.
- **Unknown keys are rejected** (`.strict()`) — mass-assignment of fields like
  `syncStatus` is impossible (verified by test).

## API surface

| Route | Operations |
| ----- | ---------- |
| `PATCH /api/profile` | partial identity update |
| `POST /api/profile/skills`, `PATCH/DELETE /api/profile/skills/[id]` | manual skill CRUD |
| `POST /api/profile/services`, `PATCH/DELETE /api/profile/services/[id]` | service CRUD |
| `POST /api/profile/certifications`, `PATCH/DELETE /api/profile/certifications/[id]` | certification CRUD |

All routes are session-gated and scoped through
`services/profile/access.js`: rows are looked up by `(id, profileId)`, so a
foreign id is indistinguishable from a missing one (404). Duplicate names hit
the `@@unique([profileId, name])` constraint and surface as friendly `409`s.

The shared handler flow lives in `services/profile/collection-crud.js` — one
implementation of auth → ownership → validation → write, parameterized per
collection.

## Skills: manual + synced coexistence

`skills.source` is `PORTFOLIO` or `MANUAL`:

- Sync replaces only `PORTFOLIO` rows (delete + recreate in the sync
  transaction). `MANUAL` rows are never touched — verified end-to-end by
  mutating the mock portfolio and re-syncing (see
  `tests/mock/portfolio-api.mjs`).
- A manual skill with the same name as a synced one is blocked by the unique
  constraint (`409`) — rename it or edit the portfolio.

## Known limitation (documented trade-off)

Identity edits are overwritten by the next portfolio sync **that has changes**.
If you reposition your title independently of the portfolio, that override is
lost. Per-field manual-override tracking (`manuallyEditedFields` on Profile +
sync skip logic) is a planned enhancement — deliberately deferred to keep the
sync service simple until the need is proven.
