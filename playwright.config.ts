import { defineConfig } from "@playwright/test";

// Runs against the development server (the only mode with the one-click development login) and a seeded
// local database. Locally it uses the installed Chrome; CI installs Chromium with `npx playwright install`.
const PORT = 3200;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL, channel: process.env.CI ? undefined : "chrome", viewport: { width: 390, height: 844 } },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXTAUTH_URL: BASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-secret",
      DEV_AUTH_BYPASS_ENABLED: "true",
      CANHOES_INTERNAL_URL: BASE_URL,
    },
  },
});
