import { createServer } from "node:http";

/**
 * Mock Freelancer.com API (accounts + api hosts share one port here) for
 * integration testing of the Freelancer adapter. Mirrors the verified
 * contract: /oauth/token (form POST), /api/users/0.1/self,
 * /api/projects/0.1/projects/all, envelope { status, result }.
 *
 * Control endpoints:
 *   POST /__fail-token  -> next token exchange returns an error
 *
 * Run: node tests/mock/freelancer-api.mjs   (listens on :4402)
 */

let failToken = false;
const issuedTokens = [];

const SELF_PROFILE = {
  id: 424242,
  username: "hasibul_dev",
  display_name: "Hasibul Alam",
  location: { country: { name: "Bangladesh" } },
  hourly_rate: 35,
  hourly_rate_json: { amount: 35, currency: { code: "USD" } },
  registration_completed: true,
};

const PROJECTS = [
  {
    id: 9001,
    name: "Laravel CRM development",
    description: "Build a custom CRM in Laravel.",
    seo_url: "laravel-crm-development",
    budget: { minimum: 500, maximum: 1200 },
    currency: { code: "USD" },
    time_submitted: "2026-09-28T10:00:00Z",
    job: [42, 88],
  },
  {
    id: 9002,
    name: "Next.js dashboard with PostgreSQL",
    description: "SaaS dashboard frontend and API.",
    seo_url: "nextjs-dashboard-postgresql",
    budget: { minimum: 800, maximum: 2000 },
    currency: { code: "USD" },
    time_submitted: "2026-09-30T08:30:00Z",
    job: [10, 42],
  },
];

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost:4402");

  if (url.pathname === "/__fail-token") {
    failToken = true;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  // OAuth token endpoint (authorization_code + refresh_token grants).
  if (url.pathname === "/oauth/token" && request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      const params = new URLSearchParams(body);
      const grantType = params.get("grant_type");
      if (failToken) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_grant", error_description: "Code expired" }));
        return;
      }
      const accessToken = `fln-token-${issuedTokens.length + 1}`;
      const refreshToken = `fln-refresh-${issuedTokens.length + 1}`;
      issuedTokens.push({ grantType, accessToken });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
          scope: "basic",
          token_type: "bearer",
        })
      );
    });
    return;
  }

  // API endpoints require the Freelancer-OAuth-V1 header (like production).
  const authHeader = request.headers["freelancer-oauth-v1"];
  if (!authHeader) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(
      JSON.stringify({ status: "error", error_code: "missing_auth", message: "OAuth token required", request_id: "req-1" })
    );
    return;
  }

  if (url.pathname === "/api/users/0.1/self") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "success", result: SELF_PROFILE }));
    return;
  }

  if (url.pathname === "/api/projects/0.1/projects/all") {
    const query = (url.searchParams.get("query") ?? "").toLowerCase();
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const filtered = PROJECTS.filter(
      (project) =>
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
    );
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        status: "success",
        result: { projects: filtered.slice(0, limit), total_count: filtered.length },
      })
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ status: "error", error_code: "not_found", message: "Unknown endpoint" }));
});

server.listen(4402, () => {
  process.stdout.write("Mock Freelancer API listening on http://localhost:4402\n");
});
