import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

// Integration tests run against a real PostgreSQL database whose name must end in "_test"
// (checked in tests/integration/setup/globalSetup.ts, because every test file truncates it).
const testDatabaseUrl = process.env.TEST_DATABASE_URL
  ?? "postgresql://canhoes:canhoes_local@localhost:5433/canhoes_test?schema=public";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve("."),
      // The real module throws outside React Server Components; tests run in plain Node.
      "server-only": path.resolve("node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["app/**", "components/**", "lib/**"],
      exclude: ["**/*.test.{ts,tsx}"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: [...configDefaults.exclude, ".next/**", "**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: [...configDefaults.exclude, ".next/**"],
          setupFiles: ["tests/component/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.int.test.ts"],
          globalSetup: ["tests/integration/setup/globalSetup.ts"],
          setupFiles: ["tests/integration/setup/perFile.ts"],
          fileParallelism: false,
          env: {
            DATABASE_URL: testDatabaseUrl,
            NEXTAUTH_SECRET: "integration-test-secret",
            DEV_AUTH_BYPASS_ENABLED: "false",
          },
        },
      },
    ],
  },
});
