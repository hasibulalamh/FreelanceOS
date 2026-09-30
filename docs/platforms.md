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
| Freelancer | ✓ public API | ✓ | API | manual |
| PeoplePerHour | ✗ none | ✗ | manual | manual only |
| Guru | ✗ none | ✗ | manual | manual only |
| Contra | ✗ none | ✗ | manual | manual only |

## How the UI uses it

`GET /api/platforms` (session required) returns the DB-seeded catalog plus the
user's account status per platform. The Platforms page renders capability
cards with their notes — there is no hardcoded "API available" copy anywhere.

## Non-goals (hard requirements from the spec)

- No scraping of marketplaces.
- No credential/cookie extraction, CAPTCHA or anti-bot bypass.
- No mass messaging/applications or background submissions.
- The final Create / Publish / Submit action is always the user's click.
