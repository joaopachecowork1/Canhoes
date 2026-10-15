import { describe, expect, it } from "vitest";

import { shouldRedirectUnauthenticated } from "./middleware";

describe("shouldRedirectUnauthenticated", () => {
  it("requires a token for protected routes", () => {
    expect(shouldRedirectUnauthenticated("/canhoes", null)).toBe(true);
    expect(shouldRedirectUnauthenticated("/canhoes/votacao", undefined)).toBe(true);
  });

  it("allows any authenticated token without forcing admin from middleware", () => {
    expect(shouldRedirectUnauthenticated("/canhoes", { sub: "user-1" })).toBe(false);
    expect(shouldRedirectUnauthenticated("/canhoes/admin", { sub: "user-2", isAdmin: false })).toBe(false);
  });

  it("lets anonymous visitors reach the login and invite registration pages", () => {
    expect(shouldRedirectUnauthenticated("/canhoes/login", null)).toBe(false);
    expect(shouldRedirectUnauthenticated("/canhoes/register", null)).toBe(false);
  });

  it("protects look-alike paths", () => {
    expect(shouldRedirectUnauthenticated("/canhoes/registerx", null)).toBe(true);
    expect(shouldRedirectUnauthenticated("/canhoes/register/../admin", null)).toBe(true);
  });
});
