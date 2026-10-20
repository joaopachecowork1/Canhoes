import { describe, expect, it } from "vitest";

import { authorizeGoogleSignIn } from "@/lib/domains/auth/services/signInAccess";
import { prisma } from "@/lib/prisma";

import { addMember, createEvent, createUser } from "./helpers";

const DAY_MS = 86_400_000;

async function invite(email: string, { eventId = null as string | null, expiresInMs = DAY_MS } = {}) {
  const admin = await createUser({ isAdmin: true });
  return prisma.userInvitation.create({
    data: {
      email,
      token: `token-${email}`,
      invitedByUserId: admin.id,
      expiresAtUtc: new Date(Date.now() + expiresInMs),
      eventId,
    },
  });
}

const google = (email: string) => ({ email, externalId: `google-${email}`, displayName: "Convidada" });

describe("Google sign-in", () => {
  it("turns away accounts without an invitation and creates nothing", async () => {
    expect(await authorizeGoogleSignIn(google("stranger@example.test"))).toBe(false);
    expect(await prisma.user.count()).toBe(0);
  });

  it("turns away expired invitations", async () => {
    await invite("late@example.test", { expiresInMs: -1000 });
    expect(await authorizeGoogleSignIn(google("late@example.test"))).toBe(false);
  });

  it("accepts an open invitation once: creates the user, joins the event and uses the invitation", async () => {
    const event = await createEvent();
    await invite("guest@example.test", { eventId: event.id });

    expect(await authorizeGoogleSignIn(google("Guest@Example.test"))).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "guest@example.test" } });
    expect(user.isAdmin).toBe(false);
    expect(await prisma.eventMember.count({ where: { eventId: event.id, userId: user.id } })).toBe(1);
    expect((await prisma.userInvitation.findFirstOrThrow()).usedAtUtc).not.toBeNull();
    expect(await authorizeGoogleSignIn(google("guest@example.test"))).toBe(true);
  });

  it("lets admins and existing members in", async () => {
    const admin = await createUser({ isAdmin: true });
    const member = await createUser();
    await addMember((await createEvent()).id, member.id);

    expect(await authorizeGoogleSignIn({ email: admin.email, externalId: admin.externalId, displayName: null })).toBe(
      true,
    );
    expect(await authorizeGoogleSignIn({ email: member.email, externalId: member.externalId, displayName: null })).toBe(
      true,
    );
  });
});
