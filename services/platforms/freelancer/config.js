/**
 * Freelancer.com adapter configuration.
 *
 * URLs verified against the official developer docs bundle
 * (developers.freelancer.com) and the freelancer-sdk-python sources:
 *   - authorize: https://accounts.freelancer.com/oauth/authorize
 *   - token:     https://accounts.freelancer.com/oauth/token
 *   - api:       https://www.freelancer.com/api/... (header: Freelancer-OAuth-V1)
 *
 * Base URLs are env-overridable to support the official sandbox
 * (www.freelancer-sandbox.com) and integration tests.
 */

function optional(name, fallback) {
  const value = process.env[name];
  return value && value !== "" ? value : fallback;
}

export const freelancerConfig = {
  get clientId() {
    return process.env.FREELANCER_CLIENT_ID || "";
  },
  get clientSecret() {
    return process.env.FREELANCER_CLIENT_SECRET || "";
  },
  get accountsBaseUrl() {
    return optional("FREELANCER_ACCOUNTS_BASE_URL", "https://accounts.freelancer.com");
  },
  get apiBaseUrl() {
    return optional("FREELANCER_API_BASE_URL", "https://www.freelancer.com");
  },
  // The basic scope covers identity; projects search works with it.
  scope: "basic",
  oauthStateCookie: "freelancer-oauth-state",
};

/** True when OAuth app credentials exist — connecting is then possible. */
export function isConfigured() {
  return Boolean(freelancerConfig.clientId && freelancerConfig.clientSecret);
}
