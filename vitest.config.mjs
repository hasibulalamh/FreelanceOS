import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Only unit tests; API/E2E tests will be added in the testing phase.
    include: ["tests/unit/**/*.test.js"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js provides this alias; vitest gets a no-op stub so server
      // modules (lib/config, lib/crypto, services/*) can be unit-tested.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.js"),
    },
  },
});
