import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // Fail builds on dead code: an unused binding is almost always a bug
      // or leftover refactor work in a single-maintainer codebase.
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Plain JavaScript project: catch references to names that were never
      // imported (the TypeScript checker does this for TS projects).
      "no-undef": "error",
      // Strict equality keeps database comparisons (null vs undefined,
      // 0 vs "") predictable. == with null is still allowed via options below.
      eqeqeq: ["error", "smart"],
      // Prefer explicit, non-mutating patterns by default.
      "prefer-const": "error",
      "object-shorthand": ["warn", "always"],
      // Debug logging should be intentional. Server logs will move through a
      // structured logger later; keep warn/error allowed everywhere.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma generated client should never be linted.
    "node_modules/.prisma/**",
  ]),
]);

export default eslintConfig;
