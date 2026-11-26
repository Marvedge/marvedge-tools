import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Backend link tests run under Node environment via vitest.node.config.ts
    exclude: [
      "src/test/links-admin.test.ts",
      "src/test/links-blocklist.test.ts",
      "src/test/links-ip.test.ts",
      "src/test/links-password.test.ts",
      "src/test/links-ratelimit.test.ts",
      "src/test/links-redirect.test.ts",
      "src/test/links-reserved.test.ts",
      "src/test/links-service.test.ts",
      "src/test/links-slug.test.ts",
      "src/test/links-token.test.ts",
      "src/test/links-url-policy.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
