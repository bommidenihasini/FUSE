import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@fuse/contracts": path.resolve("packages/contracts/src/index.ts"),
      "@fuse/test-fixtures": path.resolve("packages/test-fixtures/src/index.ts"),
      "@fuse/persistence": path.resolve("packages/persistence/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "infra/**/*.test.ts"],
  },
});
