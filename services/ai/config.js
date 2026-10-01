/**
 * Gemini AI engine configuration.
 *
 * Talks REST directly to the documented generativelanguage.googleapis.com
 * v1beta `generateContent` endpoint — same zero-dependency fetch pattern as
 * the platform adapters. Structured output uses `responseJsonSchema`
 * (standard JSON Schema; the older `responseSchema` dialect is deprecated).
 *
 * Base URL and model are env-overridable for the integration mock and for
 * future model upgrades without code changes.
 */

function optional(name, fallback) {
  const value = process.env[name];
  return value && value !== "" ? value : fallback;
}

export const aiConfig = {
  get apiKey() {
    return process.env.GEMINI_API_KEY || "";
  },
  // Stable, documented Flash model. Override with GEMINI_MODEL when a newer
  // generation (e.g. a stable gemini-3.x) is desired.
  get model() {
    return optional("GEMINI_MODEL", "gemini-2.5-flash");
  },
  get baseUrl() {
    return optional(
      "GEMINI_API_BASE_URL",
      "https://generativelanguage.googleapis.com"
    );
  },
  get apiVersion() {
    return optional("GEMINI_API_VERSION", "v1beta");
  },
  // Safety margins for non-interactive generations.
  temperature: 0.7,
  maxOutputTokens: 8192,
  requestTimeoutMs: 60_000,
};

/** True when an API key exists — AI modules are then usable. */
export function isAiConfigured() {
  return Boolean(aiConfig.apiKey);
}
