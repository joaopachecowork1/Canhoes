import { describe, expect, it } from "vitest";
import { AdminRoleChangeError, assertAdminRoleChangeAllowed, type AdminRoleChange } from "./adminRolePolicy";

function rejectionCode(change: AdminRoleChange) {
  try {
    assertAdminRoleChangeAllowed(change);
    return null;
  } catch (error) {
    return error instanceof AdminRoleChangeError ? error.code : "UNEXPECTED_ERROR";
  }
}

const base = {
  actorUserId: "actor",
  targetUserId: "target",
  targetIsAdmin: true,
  nextIsAdmin: false,
  adminCount: 2,
  confirmSelfDemotion: false,
};

describe("admin role policy", () => {
  it("allows promotion", () => {
    expect(() =>
      assertAdminRoleChangeAllowed({
        ...base,
        targetIsAdmin: false,
        nextIsAdmin: true,
      }),
    ).not.toThrow();
  });

  it("prevents removing the last admin", () => {
    expect(rejectionCode({ ...base, adminCount: 1 })).toBe("LAST_ADMIN_REQUIRED");
  });

  it("requires explicit confirmation for self-demotion", () => {
    expect(rejectionCode({ ...base, actorUserId: "target" })).toBe("SELF_DEMOTION_CONFIRMATION_REQUIRED");
  });

  it("allows a confirmed self-demotion when another admin remains", () => {
    expect(() =>
      assertAdminRoleChangeAllowed({
        ...base,
        actorUserId: "target",
        confirmSelfDemotion: true,
      }),
    ).not.toThrow();
  });
});
