/**
 * HTTP client for the portfolio API (hasibulalam.com backend).
 *
 * The portfolio answers with the envelope { data, message, errors } — this
 * client unwraps `data` and turns failures into PortfolioApiError so the
 * sync service never has to parse raw responses.
 */

export class PortfolioApiError extends Error {
  constructor(message, { status = null, path = null } = {}) {
    super(message);
    this.name = "PortfolioApiError";
    this.status = status;
    this.path = path;
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * @param {string} baseUrl e.g. "https://hasibulalam.com" (no trailing slash)
 * @param {string} path e.g. "/api/skills"
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<unknown>} the unwrapped `data` payload
 */
export async function fetchPortfolioData(baseUrl, path, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      // Never cache: sync must reflect the portfolio's current state.
      cache: "no-store",
    });
  } catch (error) {
    clearTimeout(timer);
    if (error.name === "AbortError") {
      throw new PortfolioApiError(`Portfolio API timeout after ${timeoutMs}ms: ${path}`, { path });
    }
    throw new PortfolioApiError(`Portfolio API unreachable: ${error.message}`, { path });
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new PortfolioApiError(
      `Portfolio API responded ${response.status} for ${path}`,
      { status: response.status, path }
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new PortfolioApiError(`Portfolio API returned invalid JSON for ${path}`, { path });
  }

  // The portfolio envelope always carries data/message/errors.
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new PortfolioApiError(`Portfolio API response missing data envelope for ${path}`, { path });
  }
  return payload.data;
}
