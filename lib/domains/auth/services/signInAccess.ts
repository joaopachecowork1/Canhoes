import { prisma } from "@/lib/prisma";

/**
 * Who may sign in with Google. The portal is private: admins, people who already belong to an
 * event or were invited before, and people holding an open invitation (accepted on this sign-in).
 * Everyone else is turned away, even with a valid Google account.
 */
export type SignInFacts = {
  isAdmin: boolean;
  isMember: boolean;
  wasInvited: boolean;
  hasOpenInvitation: boolean;
};

export type SignInDecision = "allow" | "accept-invitation" | "deny";

export function decideSignIn(facts: SignInFacts): SignInDecision {
  if (facts.isAdmin || facts.isMember || facts.wasInvited) return "allow";
  if (facts.hasOpenInvitation) return "accept-invitation";
  return "deny";
}

/** Applies `decideSignIn` to a Google account; accepting an invitation creates the user and their membership. */
export async function authorizeGoogleSignIn(input: { email: string; externalId: string; displayName: string | null }) {
  const email = input.email.trim().toLowerCase();
  const now = new Date();

  const [user, invitation] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ email }, { externalId: input.externalId }] },
      select: { id: true, isAdmin: true },
    }),
    prisma.userInvitation.findUnique({ where: { email } }),
  ]);
  const membershipCount = user ? await prisma.eventMember.count({ where: { userId: user.id } }) : 0;

  const decision = decideSignIn({
    isAdmin: Boolean(user?.isAdmin),
    isMember: membershipCount > 0,
    wasInvited: Boolean(invitation?.usedAtUtc),
    hasOpenInvitation: Boolean(invitation && !invitation.usedAtUtc && invitation.expiresAtUtc > now),
  });
  if (decision !== "accept-invitation" || !invitation) return decision !== "deny";

  await prisma.$transaction(async (tx) => {
    await tx.userInvitation.update({ where: { id: invitation.id }, data: { usedAtUtc: now } });
    const invitedUser = user ?? await tx.user.create({
      data: { email, externalId: input.externalId, displayName: input.displayName ?? email, isAdmin: false },
      select: { id: true, isAdmin: true },
    });
    if (invitation.eventId) {
      await tx.eventMember.upsert({
        where: { eventId_userId: { eventId: invitation.eventId, userId: invitedUser.id } },
        update: {},
        create: { eventId: invitation.eventId, userId: invitedUser.id, role: "participant", joinedAtUtc: now },
      });
    }
  });
  return true;
}
