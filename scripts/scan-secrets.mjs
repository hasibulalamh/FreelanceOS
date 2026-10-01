#!/usr/bin/env node
/**
 * Secret scanner — the local gate that keeps credentials out of git.
 *
 * Origins: a real password/email pair was once found hardcoded as
 * registration form defaults (never committed, but caught only by chance).
 * This scanner makes that class of mistake fail loudly instead.
 *
 * Usage:
 *   node scripts/scan-secrets.mjs           → scan files staged for commit
 *   node scripts/scan-secrets.mjs --all     → scan the whole tracked tree
 *
 * Staged mode reads whole index blobs, so pre-existing flagged lines in a
 * file you touch will re-fire — fix them or ignore-line them once.
 *
 * Exit codes: 0 = clean, 1 = potential secrets found.
 *
 * What it deliberately does NOT do: replace git history scanning, entropy
 * analysis, or provider-side push protection. It is a fast, dependency-free
 * pattern gate for this repo's known secret shapes. Ignore inline with
 * `freelanceos-ignore-secret` on the same line (use sparingly and only for
 * obvious placeholders).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Rules: [id, regex, human description]
// Keep these anchored to this project's real secret shapes; overly generic
// patterns (e.g. any 32-char string) would train everyone to bypass the scan.
// ---------------------------------------------------------------------------
const RULES = [
  [
    "private-key-block",
    /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/,
    "private key material",
  ],
  [
    "secret-env-name-with-literal",
    // Catches .env style (AUTH_SECRET=…, export AUTH_SECRET="…") AND
    // config-object style (AUTH_SECRET: "…"). Empty strings are fine —
    // that is exactly how .env.example ships.
    /\b(?:DATABASE_URL|AUTH_SECRET|CREDENTIAL_ENCRYPTION_KEY|GEMINI_API_KEY|GOOGLE_CLIENT_SECRET|GITHUB_CLIENT_SECRET|FREELANCER_CLIENT_SECRET)\b\s*[:=]\s*["'][^"']{8,}["']/,
    "hardcoded value for a known secret env var (should live in .env only)",
  ],
  [
    "high-entropy-assignment",
    /\b(?:password|passwd|secret|api[_-]?key|apikey|client[_-]?secret|token)\s*[:=]\s*["'][A-Za-z0-9/+_\-]{16,}={0,2}["']/i,
    "hardcoded high-entropy password/token/secret assignment",
  ],
  [
    "usestate-nonempty-literal",
    /useState\(\s*["'][^"']{4,}["']\s*\)/,
    "non-empty string literal as useState default — form fields must start " +
      "empty; hardcoded defaults are exactly how real credentials leaked in",
  ],
  [
    "postgres-url-with-credentials",
    /postgres(?:ql)?:\/\/[^\s"'/:*]+:[^\s"'@]+@/,
    "postgres URL with inline credentials",
  ],
  [
    "generic-provider-token",
    /\b(?:ghp|gho|github_pat|xox[baprs]-|sk-)[A-Za-z0-9_-]{16,}\b/,
    "provider token literal",
  ],
  [
    "bcrypt-or-jwt",
    /\$2[ab]\$|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\./,
    "bcrypt hash or JWT literal",
  ],
];

// Documented fixture/example values that are intentional, not secrets.
// Keep this list short and specific — it is a blind spot by design.
const ALLOWED_PATTERNS = [
  // Example connection string in .env.example / docs (user:password placeholder).
  /postgresql:\/\/user:password@localhost/,
  // URLs whose credentials are interpolated from env at runtime.
  /postgresql:\/\/\$\{/,
  // Unit-test fixtures that SET env vars to obviously fake values
  // (process.env.GEMINI_API_KEY = "test-key"). A real leaked secret would
  // never start with "test".
  /process\.env\.[A-Z_]+\s*=\s*["']test/,
];

const ALLOWED_PATHS = [
  /(^|\/)\.env(\.|$)/, // .env* are gitignored and never a source of truth
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)\.git\//,
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
];

const INLINE_IGNORE = /freelanceos-ignore-secret/;

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

function listStagedFiles() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { cwd: ROOT, encoding: "utf8" }
  );
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

function listTrackedFiles() {
  const out = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

function isAllowedPath(relPath) {
  return ALLOWED_PATHS.some((re) => re.test(relPath));
}

function isAllowedLine(line) {
  return (
    INLINE_IGNORE.test(line) || ALLOWED_PATTERNS.some((re) => re.test(line))
  );
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

function scanFile(relPath, { useIndex }) {
  // Staged mode reads the index blob: the scan sees exactly what will be
  // committed, not whatever sits in the working tree. Full-tree mode reads
  // the working tree, so uncommitted edits are audited too.
  const raw = useIndex
    ? execFileSync("git", ["show", `:${relPath}`], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      })
    : readFileSync(path.join(ROOT, relPath), "utf8");
  const findings = [];
  raw.split("\n").forEach((line, i) => {
    if (isAllowedLine(line)) return;
    for (const [id, re, description] of RULES) {
      if (re.test(line)) {
        findings.push({
          path: relPath,
          line: i + 1,
          id,
          description,
          text: line.trim().slice(0, 120),
        });
      }
    }
  });
  return findings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const modeAll = process.argv.includes("--all");
const files = (modeAll ? listTrackedFiles() : listStagedFiles()).filter(
  (f) => !isAllowedPath(f)
);

if (files.length === 0) {
  console.warn("scan-secrets: no files to scan — clean.");
  process.exit(0);
}

let allFindings = [];
for (const relPath of files) {
  try {
    allFindings = allFindings.concat(scanFile(relPath, { useIndex: !modeAll }));
  } catch {
    // File deleted between staging and scan, or unreadable — skip quietly.
  }
}

if (allFindings.length > 0) {
  console.error(
    `\nscan-secrets: ${allFindings.length} potential secret(s) found in ` +
      `${modeAll ? "the tracked tree" : "staged files"}:\n`
  );
  for (const f of allFindings) {
    console.error(`  ${f.path}:${f.line}  [${f.id}]  ${f.description}`);
    console.error(`    ${f.text}\n`);
  }
  console.error(
    "Secrets belong in .env (gitignored). If this is a documented " +
      "placeholder, add it to ALLOWED_PATTERNS in scripts/scan-secrets.mjs " +
      "or append `freelanceos-ignore-secret` to the line."
  );
  process.exit(1);
}

console.warn(
  `scan-secrets: clean (${files.length} file(s) scanned, ` +
    `${RULES.length} rules${modeAll ? ", full tree" : ", staged files only"}).`
);
process.exit(0);
