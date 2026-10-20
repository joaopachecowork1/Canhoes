import { describe, expect, it } from "vitest";
import { isDevelopmentAuthEnabled } from "./developmentAuth";

describe("development authentication", () => {
  it("is enabled explicitly outside production", () => {
    expect(
      isDevelopmentAuthEnabled({
        NODE_ENV: "development",
        DEV_AUTH_BYPASS_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("can never be enabled in production", () => {
    expect(
      isDevelopmentAuthEnabled({
        NODE_ENV: "production",
        DEV_AUTH_BYPASS_ENABLED: "true",
      }),
    ).toBe(false);
  });

  it("is disabled by default", () => {
    expect(isDevelopmentAuthEnabled({ NODE_ENV: "development" })).toBe(false);
  });
});
