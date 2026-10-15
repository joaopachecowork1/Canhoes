import { describe, expect, it } from "vitest";

import { resolveAdminStatus } from "@/lib/domains/auth/services/adminStatus";

describe("resolveAdminStatus", () => {
  it("accepts an admin session without further waiting", () => {
    const result = resolveAdminStatus({ authLoading: false, isLogged: true, userIsAdmin: true });

    expect(result.isAdmin).toBe(true);
    expect(result.isLoading).toBe(false);
    expect(result.source).toBe("profile");
  });

  it("keeps loading while the session is still resolving", () => {
    const result = resolveAdminStatus({ authLoading: true, isLogged: false, userIsAdmin: false });

    expect(result.isAdmin).toBe(false);
    expect(result.isLoading).toBe(true);
  });

  it("never grants admin access to a signed-out profile", () => {
    const result = resolveAdminStatus({ authLoading: false, isLogged: false, userIsAdmin: true });

    expect(result.isAdmin).toBe(false);
    expect(result.source).toBeNull();
  });
});
