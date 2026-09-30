import { describe, expect, it } from "vitest";

import {
  identityUpdateSchema,
  skillCreateSchema,
  skillUpdateSchema,
  serviceCreateSchema,
  certificationCreateSchema,
  certificationUpdateSchema,
} from "@/validators/profile";

describe("identityUpdateSchema", () => {
  it("accepts a partial update and trims values", () => {
    const result = identityUpdateSchema.safeParse({ fullName: "  Hasibul Alam  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe("Hasibul Alam");
  });

  it("clears nullable fields when an empty string is submitted", () => {
    const result = identityUpdateSchema.safeParse({ location: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.location).toBeNull();
  });

  it("rejects fully empty updates", () => {
    expect(identityUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown keys (mass-assignment guard)", () => {
    const result = identityUpdateSchema.safeParse({ syncStatus: "SYNCED" });
    expect(result.success).toBe(false);
  });

  it("normalizes currency to 3 uppercase letters", () => {
    const result = identityUpdateSchema.safeParse({ currency: "usd", hourlyRate: "45" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
      expect(result.data.hourlyRate).toBe(45);
    }
  });

  it("rejects invalid hourly rates and currencies", () => {
    expect(identityUpdateSchema.safeParse({ hourlyRate: -5 }).success).toBe(false);
    expect(identityUpdateSchema.safeParse({ currency: "USDD" }).success).toBe(false);
  });

  it("validates website URLs", () => {
    expect(identityUpdateSchema.safeParse({ websiteUrl: "not-a-url" }).success).toBe(false);
    expect(identityUpdateSchema.safeParse({ websiteUrl: "https://hasibulalam.com" }).success).toBe(true);
  });
});

describe("skill schemas", () => {
  it("requires a non-empty name", () => {
    expect(skillCreateSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(skillCreateSchema.safeParse({ name: "Laravel" }).success).toBe(true);
  });

  it("bounds level to 1..5 and clears it on empty", () => {
    expect(skillCreateSchema.safeParse({ name: "X", level: 0 }).success).toBe(false);
    expect(skillCreateSchema.safeParse({ name: "X", level: 6 }).success).toBe(false);
    const cleared = skillCreateSchema.safeParse({ name: "X", level: "" });
    expect(cleared.success).toBe(true);
    if (cleared.success) expect(cleared.data.level).toBeNull();
  });

  it("allows partial updates", () => {
    expect(skillUpdateSchema.safeParse({ level: 3 }).success).toBe(true);
  });
});

describe("service schemas", () => {
  it("requires a title, allows optional fields", () => {
    expect(serviceCreateSchema.safeParse({ title: "Laravel CRM development" }).success).toBe(true);
    expect(serviceCreateSchema.safeParse({ title: "" }).success).toBe(false);
    const withExtras = serviceCreateSchema.safeParse({
      title: "Laravel CRM development",
      category: "Web development",
      description: "Custom CRM builds.",
    });
    expect(withExtras.success).toBe(true);
  });
});

describe("certification schemas", () => {
  const base = { name: "AWS SA", issuer: "Amazon" };

  it("requires name and issuer", () => {
    expect(certificationCreateSchema.safeParse({ name: "X" }).success).toBe(false);
  });

  it("parses YYYY-MM-DD dates", () => {
    const result = certificationCreateSchema.safeParse({ ...base, issueDate: "2024-06-01" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.issueDate?.toISOString()).toContain("2024-06-01");
  });

  it("rejects malformed dates", () => {
    expect(certificationCreateSchema.safeParse({ ...base, issueDate: "06/2024" }).success).toBe(false);
  });

  it("enforces expiry after issue", () => {
    const bad = certificationCreateSchema.safeParse({
      ...base,
      issueDate: "2024-06-01",
      expiryDate: "2024-01-01",
    });
    expect(bad.success).toBe(false);
  });

  it("allows partial updates", () => {
    expect(certificationUpdateSchema.safeParse({ issuer: "New Issuer" }).success).toBe(true);
  });
});
