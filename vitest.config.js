import path from "path";
import { defineConfig } from "vitest/config";

// Integration tests run against a real PostgreSQL database whose name must end in "_test"
// (checked in tests/integration/setup/globalSetup.ts, because every test file truncates it).
const testDatabaseUrl = process.env.TEST_DATABASE_URL
  ?? "postgresql://canhoes:canhoes_local@localhost:5433/canhoes_test?schema=public";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve("."),
    },
  },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: ["**/node_modules/**", ".next/**", "**/*.int.test.ts"],
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
