import { afterEach, describe, expect, it, vi } from "vitest";

/** The headers `next.config.mjs` sends on every route, as the given NODE_ENV would build them. */
async function loadHeaders(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const { default: nextConfig } = await import("./next.config.mjs");
  const [rule] = await nextConfig.headers();
  return rule.headers.map((header: { key: string }) => header.key);
}

describe("next.config security headers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends HSTS in production only, so the local HTTPS dev server cannot pin http://localhost for a year", async () => {
    expect(await loadHeaders("production")).toContain("Strict-Transport-Security");
    expect(await loadHeaders("development")).not.toContain("Strict-Transport-Security");
  });

  it("always sends the other hardening headers", async () => {
    expect(await loadHeaders("development")).toEqual(expect.arrayContaining(["X-Content-Type-Options", "X-Frame-Options"]));
  });
});
