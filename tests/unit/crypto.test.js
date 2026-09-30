import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { encryptSecret, decryptSecret } from "@/lib/crypto";

describe("token encryption", () => {
  const OLD_ENV = process.env.CREDENTIAL_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = "a".repeat(64);
  });
  afterAll(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = OLD_ENV;
  });

  // The key is read at call time (see lib/crypto.js loadKey), so setting the
  // env var here is sufficient for every test below.

  it("roundtrips a token", () => {
    const token = "fln-oauth-token-abc123";
    const envelope = encryptSecret(token);
    expect(envelope).not.toContain(token);
    expect(envelope.startsWith("v1:")).toBe(true);
    expect(decryptSecret(envelope)).toBe(token);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("fails when the ciphertext is tampered with", () => {
    const envelope = encryptSecret("secret");
    const parts = envelope.split(":");
    const data = Buffer.from(parts[3], "base64url");
    data[0] ^= 0xff; // flip a bit
    parts[3] = data.toString("base64url");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });

  it("fails when decrypted with a different key", () => {
    const envelope = encryptSecret("secret");
    process.env.CREDENTIAL_ENCRYPTION_KEY = "b".repeat(64);
    expect(() => decryptSecret(envelope)).toThrow();
    process.env.CREDENTIAL_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("rejects malformed envelopes", () => {
    expect(() => decryptSecret("not-an-envelope")).toThrow();
    expect(() => decryptSecret("v9:a:b:c")).toThrow();
  });
});
