import { randomBytes } from "node:crypto";

import { freelancerConfig } from "@/services/platforms/freelancer/config";
import { FreelancerApiError } from "@/services/platforms/freelancer/client";

/**
 * OAuth 2.0 authorization-code flow for the Freelancer.com official API.
 * Flow shape verified against developers.freelancer.com:
 *   GET  {accounts}/oauth/authorize?response_type=code&client_id=...
 *        &redirect_uri=...&scope=basic&prompt=select_account consent
 *   POST {accounts}/oauth/token  (form-urlencoded)
 *        grant_type=authorization_code / refresh_token
 *        -> { access_token, refresh_token, expires_in, ... }
 */

/** Unguessable per-connect state; stored in an httpOnly cookie for the callback check. */
export function createState() {
  return randomBytes(32).toString("hex");
}

/**
 * @param {object} options
 * @param {string} options.state CSRF state (from createState)
 * @param {string} options.redirectUri must match the URI registered on the
 *   Freelancer developer application
 * @returns {string} the authorization URL to redirect the browser to
 */
export function buildAuthorizeUrl({ state, redirectUri }) {
  const url = new URL(`${freelancerConfig.accountsBaseUrl}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", freelancerConfig.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", freelancerConfig.scope);
  // select_account + consent per the official docs example.
  url.searchParams.set("prompt", "select_account consent");
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Exchanges an authorization code for tokens.
 * @returns {Promise<{accessToken, refreshToken, expiresAt, scope}>}
 */
export async function exchangeCodeForTokens({ code, redirectUri }) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: freelancerConfig.clientId,
    client_secret: freelancerConfig.clientSecret,
  });
}

/**
 * Refreshes an expired access token.
 * @returns {Promise<{accessToken, refreshToken, expiresAt, scope}>}
 */
export async function refreshTokens(refreshToken) {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: freelancerConfig.clientId,
    client_secret: freelancerConfig.clientSecret,
  });
}

async function tokenRequest(form) {
  let response;
  try {
    response = await fetch(`${freelancerConfig.accountsBaseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form).toString(),
    });
  } catch (error) {
    throw new FreelancerApiError(`Freelancer OAuth endpoint unreachable: ${error.message}`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new FreelancerApiError(
      payload?.error_description || payload?.error || `Freelancer OAuth token exchange failed (${response.status})`,
      { status: response.status }
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    // expires_in is seconds; store the absolute expiry for proactive refresh.
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : null,
    scope: payload.scope ?? freelancerConfig.scope,
  };
}
