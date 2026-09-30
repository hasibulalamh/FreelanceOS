import "server-only";

// Central access to server-only configuration. All feature code must read
// configuration through this module instead of process.env directly so that
// (a) required variables fail loudly at first use, and (b) secrets are never
// imported into client components (enforced by the "server-only" import).

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and set it.`
    );
  }
  return value;
}

function optional(name, fallback = undefined) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export const serverConfig = {
  get authSecret() {
    return required("AUTH_SECRET");
  },
  // Portfolio sync is optional at runtime: when unset, sync reports a
  // Pending/"not configured" state instead of crashing the dashboard.
  portfolioApiUrl: optional("PORTFOLIO_API_URL"),
};

/** OAuth providers configured for this deployment (derived from env presence). */
export const oauthProviders = {
  google: Boolean(optional("GOOGLE_CLIENT_ID") && optional("GOOGLE_CLIENT_SECRET")),
  github: Boolean(optional("GITHUB_CLIENT_ID") && optional("GITHUB_CLIENT_SECRET")),
};
