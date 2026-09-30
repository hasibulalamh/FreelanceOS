import { describe, expect, it, beforeEach } from "vitest";

import { buildAuthorizeUrl, createState } from "@/services/platforms/freelancer/oauth";
import { isConfigured } from "@/services/platforms/freelancer/config";

describe("freelancer oauth", () => {
  beforeEach(() => {
    process.env.FREELANCER_CLIENT_ID = "test-client-id";
    process.env.FREELANCER_CLIENT_SECRET = "test-client-secret";
    delete process.env.FREELANCER_ACCOUNTS_BASE_URL;
    delete process.env.FREELANCER_API_BASE_URL;
  });

  it("builds the authorize URL with the documented parameters", () => {
    const url = new URL(
      buildAuthorizeUrl({ state: "abc123", redirectUri: "https://app.example.com/api/platforms/freelancer/callback" })
    );

    expect(url.origin + url.pathname).toBe("https://accounts.freelancer.com/oauth/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/platforms/freelancer/callback"
    );
    expect(url.searchParams.get("scope")).toBe("basic");
    expect(url.searchParams.get("prompt")).toBe("select_account consent");
    expect(url.searchParams.get("state")).toBe("abc123");
  });

  it("honors the sandbox/test base URL override", () => {
    process.env.FREELANCER_ACCOUNTS_BASE_URL = "http://localhost:4402";
    const url = new URL(
      buildAuthorizeUrl({ state: "s", redirectUri: "http://localhost:3100/cb" })
    );
    expect(url.origin).toBe("http://localhost:4402");
  });

  it("isConfigured reflects env presence", () => {
    expect(isConfigured()).toBe(true);
    process.env.FREELANCER_CLIENT_ID = "";
    expect(isConfigured()).toBe(false);
  });

  it("creates 64-char hex state values", () => {
    expect(createState()).toMatch(/^[a-f0-9]{64}$/);
  });
});
