# AI Engine (Gemini)

Phase 8 introduces the AI layer: a thin Gemini client, a versioned prompt
registry, and the first AI-powered module — **keyword research**. The layer
follows one invariant from the spec:

> **AI proposes; the app validates and writes.** The model never touches the
> database, marketplaces, or the filesystem. Its output is validated JSON,
> stored as an auditable draft, and rendered read-only until a later phase
> adds explicit apply actions.

## Architecture

```
services/ai/
  config.js             env-driven settings (key, model, base URL, limits)
  client.js             generateStructured(): REST call + schema validation
  prompts.js            versioned prompt registry (never edit in place)
  generation-service.js projection → prompt → generate → validate → persist
validators/ai.js        API input schemas + cross-field output rules
app/api/ai/*            thin route handlers (auth, rate limit, envelope)
components/ai/*         client islands (AI Studio UI)
```

Rules inherited from `docs/architecture.md`:

1. The client is **zero-dependency** — plain `fetch`, like the platform
   adapters. No SDK lock-in.
2. Prompts are **versioned**: `PROMPTS.KIND.currentVersion` points at an
   immutable entry. Each `AiGeneration` row stores the version used, so old
   outputs stay interpretable after prompts evolve. To change a prompt, add
   `version: 2` and switch the pointer.
3. **Two validation passes.** The client validates the raw shape (the schema
   is also sent to Gemini as `responseJsonSchema`), and the service applies
   cross-field rules (e.g. unique keywords) that JSON Schema cannot express.

## Gemini integration details

- Endpoint: `POST {GEMINI_API_BASE_URL}/{GEMINI_API_VERSION}/models/{model}:generateContent`
  (defaults: `https://generativelanguage.googleapis.com`, `v1beta`).
- Auth: `x-goog-api-key` header.
- Structured output: `generationConfig.responseMimeType = "application/json"`
  plus `responseJsonSchema` — the current documented mechanism (standard
  JSON Schema, produced from zod v4 via `z.toJSONSchema`). The legacy
  `responseSchema` dialect is deliberately not used.
- Default model: `gemini-2.5-flash` (stable), overridable with
  `GEMINI_MODEL`.
- Errors are normalized to `GeminiError` with a `reason`:
  `not_configured | network | timeout | invalid_response | api_error |
  empty_response | malformed_json | schema_mismatch`, plus `finishReason`
  when the model stopped early (e.g. `SAFETY`).

## Honest-data rules (enforced in the prompt and the schemas)

- The model is instructed to **never invent numeric metrics** — no search
  volumes, competition scores, CPC or salary figures. The output schemas
  have no fields where such numbers could live, and unknown keys are
  stripped by validation.
- The profile projection (`keywordProfileSchema`) only contains data from
  the user's own profile — never auth data, emails, or rates.
- When the profile is too thin, the model must say so in `caveats` instead
  of padding with plausible filler. A missing/empty profile returns an
  error before any model call is made.

## Persistence & audit

Every attempt is stored in `AiGeneration` (table `ai_generations`):

| Field | Meaning |
| ----- | ------- |
| `kind` | module key, e.g. `KEYWORD_RESEARCH` |
| `status` | `COMPLETED` or `FAILED` (failures are recorded too) |
| `model` / `promptVersion` | exact model id and prompt version used |
| `input` / `output` | validated JSON in, validated JSON out |
| `error` | failure reason when `FAILED` |
| `promptTokens` / `completionTokens` / `totalTokens` | real usage from `usageMetadata` |
| `latencyMs` | wall-clock duration of the model call |

The dashboard "AI generations" stat counts these real rows. An
`ai.keyword_research` activity entry is written for successful runs.

## API

### `POST /api/ai/keyword-research`

Session required. Rate limit: 10 requests / 10 min / user+IP.

```json
// request (extraContext optional, ≤2000 chars)
{ "extraContext": "Targeting EU SaaS founders" }

// 201 response
{
  "ok": true,
  "data": {
    "id": "…", "kind": "KEYWORD_RESEARCH",
    "model": "gemini-2.5-flash", "promptVersion": 1,
    "output": {
      "keywords": [
        { "keyword": "…", "intent": "commercial", "rationale": "…",
          "suggestedUse": "profile title" }
      ],
      "positioningSummary": "…", "caveats": ["…"]
    },
    "usage": { "promptTokens": 412, "completionTokens": 289, "totalTokens": 701 },
    "latencyMs": 1234, "createdAt": "…"
  }
}
```

Errors: `400` (invalid input / no usable profile), `401`, `429` (rate limit
or Gemini quota), `502` (upstream/validation failure), `503` (not
configured), `504` (timeout).

## Testing

- `tests/unit/gemini-client.test.js` — request shape (including
  `responseJsonSchema`), usage extraction, every error path, mocked `fetch`.
- `tests/unit/ai-prompts.test.js` — registry integrity, honesty rules in the
  system instruction, validator rules (strict input, duplicate keywords,
  collection caps).
- `tests/mock/gemini-api.mjs` (port 4403) — integration mock with modes
  `ok | http400 | safety | malformed`; used by the E2E suite.

Real Gemini E2E requires a real `GEMINI_API_KEY`, which only the account
owner can create — by design, no fake credentials live in the repo.
