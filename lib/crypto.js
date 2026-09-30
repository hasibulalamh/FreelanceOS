import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Encryption at rest for third-party OAuth tokens (e.g. the Freelancer.com
 * access/refresh tokens stored on PlatformAccount).
 *
 * Design:
 *  - AES-256-GCM (authenticated): ciphertext tampering fails decryption.
 *  - A random 12-byte IV per encryption; the auth tag is stored alongside.
 *  - The key is derived with scrypt from CREDENTIAL_ENCRYPTION_KEY, so the
 *    env var can be any sufficiently long secret (generated via
 *    `openssl rand -hex 32`).
 *  - Ciphertext format: "v1:<iv>:<tag>:<ciphertext>" (all base64url), so a
 *    future format change can coexist with old rows during migration.
 *
 * Plaintext never appears in logs and never leaves the server: only
 * services/platforms/* touch these helpers.
 */

const VERSION = "v1";

function loadKey() {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32"
    );
  }
  // scrypt derives a stable 32-byte key from any passphrase.
  return scryptSync(secret, "freelanceos.platform-oauth.v1", 32);
}

/** @param {string} plaintext @returns {string} encrypted envelope */
export function encryptSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/**
 * @param {string} envelope output of encryptSecret
 * @returns {string} original plaintext
 * @throws Error when the envelope was tampered with, was encrypted with a
 *   different key, or has an unknown version.
 */
export function decryptSecret(envelope) {
  const [version, ivB64, tagB64, dataB64] = String(envelope).split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    loadKey(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(), // throws on tamper / wrong key
  ]);
  return decrypted.toString("utf8");
}
