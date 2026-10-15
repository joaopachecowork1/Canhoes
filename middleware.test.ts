import { describe, expect, it } from "vitest";

import { isPublicPath, shouldRedirectUnauthenticated } from "./middleware";

describe("shouldRedirectUnauthenticated", () => {
  it("requires a token for protected routes", () => {
    expect(shouldRedirectUnauthenticated(null, false)).toBe(true);
    expect(shouldRedirectUnauthenticated(undefined, false)).toBe(true);
  });

  it("allows any authenticated token without forcing admin from middleware", () => {
    expect(shouldRedirectUnauthenticated({ sub: "user-1" }, false)).toBe(false);
    expect(shouldRedirectUnauthenticated({ sub: "user-2", isAdmin: false }, false)).toBe(false);
  });

  it("allows the app shell to create the local session in development", () => {
    expect(shouldRedirectUnauthenticated(null, true)).toBe(false);
  });
});

describe("isPublicPath", () => {
  it("lets the login and invitation pages through without a session", () => {
    expect(isPublicPath("/canhoes/login")).toBe(true);
    expect(isPublicPath("/canhoes/register")).toBe(true);
  });

  it("protects everything else, including look-alike paths", () => {
    expect(isPublicPath("/canhoes")).toBe(false);
    expect(isPublicPath("/canhoes/admin")).toBe(false);
    expect(isPublicPath("/canhoes/register/../admin")).toBe(false);
    expect(isPublicPath("/canhoes/registerx")).toBe(false);
  });
});
