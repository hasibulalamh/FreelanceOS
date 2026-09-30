import { describe, expect, it } from "vitest";

import {
  PLATFORMS,
  CAPABILITIES,
  CAPABILITY_STATUS,
  validateCatalog,
} from "@/services/platforms/catalog";

describe("platform catalog", () => {
  it("covers exactly the six initial platforms", () => {
    expect(PLATFORMS.map((p) => p.slug).sort()).toEqual([
      "contra",
      "fiverr",
      "freelancer",
      "guru",
      "peopleperhour",
      "upwork",
    ]);
  });

  it("defines every capability for every platform with valid status and notes", () => {
    expect(validateCatalog()).toEqual([]);
  });

  it("never allows automatic submission on any platform", () => {
    for (const platform of PLATFORMS) {
      expect(platform.capabilities.AUTOMATIC_SUBMISSION.status).toBe("NOT_SUPPORTED");
    }
  });

  it("never claims an official API where none exists", () => {
    // These marketplaces have no public API as of the catalog's writing —
    // the guard fails loudly if someone edits this without evidence.
    const noPublicApi = ["fiverr", "peopleperhour", "guru", "contra"];
    for (const slug of noPublicApi) {
      const platform = PLATFORMS.find((p) => p.slug === slug);
      expect(platform.capabilities.OFFICIAL_API.status).toBe("NOT_SUPPORTED");
      expect(platform.capabilities.OAUTH.status).toBe("NOT_SUPPORTED");
    }
  });

  it("keeps every status inside the defined status enum", () => {
    for (const platform of PLATFORMS) {
      for (const entry of Object.values(platform.capabilities)) {
        expect(CAPABILITY_STATUS).toContain(entry.status);
      }
    }
    // 9 capabilities per platform
    for (const platform of PLATFORMS) {
      expect(Object.keys(platform.capabilities).sort()).toEqual([...CAPABILITIES].sort());
    }
  });
});
