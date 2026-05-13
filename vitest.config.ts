import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Integration tests under tests/integration/** are gated behind
// RUN_INTEGRATION_TESTS=1 (and require TRUSTACCEPT_PERSISTENCE=prisma
// plus a reachable Postgres). The default `npm test` invocation
// excludes them so the in-memory suite stays self-contained.
const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: runIntegration
      ? ["node_modules/**"]
      : ["node_modules/**", "tests/integration/**"],
    environment: "node",
    testTimeout: runIntegration ? 60_000 : 10_000,
    hookTimeout: runIntegration ? 60_000 : 10_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
