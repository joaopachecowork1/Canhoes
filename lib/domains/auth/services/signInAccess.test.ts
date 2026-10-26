import { describe, expect, it } from "vitest";

import { decideSignIn, type SignInFacts } from "./signInAccess";

const stranger: SignInFacts = { isAdmin: false, isMember: false, hasOpenInvitation: false };

describe("decideSignIn", () => {
  it("turns away a Google account nobody invited", () => {
    expect(decideSignIn(stranger)).toBe("deny");
  });

  it.each([
    ["an admin", { isAdmin: true }],
    ["an event member", { isMember: true }],
  ])("lets %s in", (_label, facts) => {
    expect(decideSignIn({ ...stranger, ...facts })).toBe("allow");
  });

  it("turns away someone who used an invitation but is no longer a member of any event", () => {
    // O convite usado já não conta: sem eventos e sem convite aberto, a conta fica à porta.
    expect(decideSignIn(stranger)).toBe("deny");
  });

  it("accepts an open invitation on first sign-in", () => {
    expect(decideSignIn({ ...stranger, hasOpenInvitation: true })).toBe("accept-invitation");
  });

  it("does not consume an invitation for someone who already has access", () => {
    expect(decideSignIn({ ...stranger, isMember: true, hasOpenInvitation: true })).toBe("allow");
  });
});
