import { prisma } from "@/lib/prisma";

/**
 * Who may sign in with Google. Public onboarding can be enabled temporarily with
 * AUTH_ALLOW_PUBLIC_GOOGLE_SIGNIN=true; otherwise the portal remains invitation-only.
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

function isPublicGoogleSignInEnabled() {
  return process.env.AUTH_ALLOW_PUBLIC_GOOGLE_SIGNIN?.trim().toLowerCase() === "true";
}

/** Applies the access policy and creates a membership for a first public Google sign-in. */
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
  if (decision === "deny" && !isPublicGoogleSignInEnabled()) return false;
  if (decision !== "accept-invitation" && decision !== "deny") return true;

  await prisma.$transaction(async (tx) => {
    if (invitation && decision === "accept-invitation") {
      await tx.userInvitation.update({ where: { id: invitation.id }, data: { usedAtUtc: now } });
    }
    const invitedUser = user ?? await tx.user.create({
      data: { email, externalId: input.externalId, displayName: input.displayName ?? email, isAdmin: false },
      select: { id: true, isAdmin: true },
    });
    const eventId = invitation?.eventId ?? (await tx.event.findFirst({
      where: { isActive: true },
      orderBy: { createdAtUtc: "asc" },
      select: { id: true },
    }))?.id;
    if (eventId) {
      await tx.eventMember.upsert({
        where: { eventId_userId: { eventId, userId: invitedUser.id } },
        update: {},
        create: { eventId, userId: invitedUser.id, role: "participant", joinedAtUtc: now },
      });
    }
  });
  return true;
}
