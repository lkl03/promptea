import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // v1.2.0: *.spec.ts files existed but were never picked up by the old
    // "**/*.test.ts" pattern — five suites silently skipped. Include both.
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["node_modules", ".next", "dist", "build"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
