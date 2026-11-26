import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Dedicated Vitest configuration for backend/server-side link shortener tests.
 * Uses Node.js environment instead of jsdom so that:
 *   - node:crypto (PBKDF2, HKDF, timingSafeEqual) works correctly
 *   - server-only modules are not blocked
 *   - No browser globals interfere with pure service logic
 *
 * Run with: pnpm test:links
 */
export default defineConfig({
  test: {
    name: "links-backend",
    environment: "node",
    globals: true,
    include: [
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
      // Stub "server-only" in test environment (no Next.js runtime)
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
      // Stub "next/headers" — service.server.ts uses a try/catch so this is safe
      "next/headers": path.resolve(__dirname, "./src/test/__mocks__/next-headers.ts"),
    },
  },
});
