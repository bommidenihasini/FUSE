import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@fuse/contracts": path.resolve("packages/contracts/src/index.ts"),
      "@fuse/test-fixtures": path.resolve("packages/test-fixtures/src/index.ts"),
      "@fuse/persistence": path.resolve("packages/persistence/src/index.ts"),
      "@fuse/policy-engine": path.resolve("packages/policy-engine/src/index.ts"),
      "@fuse/enforcement": path.resolve("packages/enforcement/src/index.ts"),
      "@fuse/runner": path.resolve("packages/runner/src/index.ts"),
      "@fuse/api": path.resolve("packages/api/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "infra/**/*.test.ts", "apps/dashboard/src/**/*.test.ts"],
  },
});
