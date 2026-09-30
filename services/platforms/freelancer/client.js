import { freelancerConfig } from "@/services/platforms/freelancer/config";

export class FreelancerApiError extends Error {
  constructor(message, { status = null, errorCode = null, requestId = null, path = null } = {}) {
    super(message);
    this.name = "FreelancerApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.requestId = requestId;
    this.path = path;
  }
}

/**
 * Calls the official Freelancer API with the stored OAuth token.
 * All API responses use the { result, status, error_code, request_id }
 * envelope; errors are mapped to FreelancerApiError.
 *
 * @param {string} accessToken decrypted OAuth access token
 * @param {string} path e.g. "users/0.1/self" (relative to the api base)
 * @param {object} [params] query parameters (values are URL-encoded)
 */
export async function freelancerApiFetch(accessToken, path, params = {}) {
  const url = new URL(`${freelancerConfig.apiBaseUrl}/api/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetch(url, {
      headers: {
        // The official API auth header (see freelancer-sdk-python session.py).
        "Freelancer-OAuth-V1": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new FreelancerApiError(`Freelancer API unreachable: ${error.message}`, { path });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new FreelancerApiError(`Freelancer API returned invalid JSON for ${path}`, {
      status: response.status,
      path,
    });
  }

  if (!response.ok || payload?.status === "error") {
    throw new FreelancerApiError(payload?.message || `Freelancer API error for ${path}`, {
      status: response.status,
      errorCode: payload?.error_code ?? null,
      requestId: payload?.request_id ?? null,
      path,
    });
  }

  return payload.result;
}
