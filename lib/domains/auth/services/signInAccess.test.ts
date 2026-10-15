import { describe, expect, it } from "vitest";

import { decideSignIn, type SignInFacts } from "./signInAccess";

const stranger: SignInFacts = { isAdmin: false, isMember: false, wasInvited: false, hasOpenInvitation: false };

describe("decideSignIn", () => {
  it("turns away a Google account nobody invited", () => {
    expect(decideSignIn(stranger)).toBe("deny");
  });

  it.each([
    ["an admin", { isAdmin: true }],
    ["an event member", { isMember: true }],
    ["someone who already used an invitation", { wasInvited: true }],
  ])("lets %s in", (_label, facts) => {
    expect(decideSignIn({ ...stranger, ...facts })).toBe("allow");
  });

  it("accepts an open invitation on first sign-in", () => {
    expect(decideSignIn({ ...stranger, hasOpenInvitation: true })).toBe("accept-invitation");
  });

  it("does not consume an invitation for someone who already has access", () => {
    expect(decideSignIn({ ...stranger, isMember: true, hasOpenInvitation: true })).toBe("allow");
  });
});
