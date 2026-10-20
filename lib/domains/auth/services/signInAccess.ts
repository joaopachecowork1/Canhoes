import { prisma } from "@/lib/prisma";

/**
 * Quem pode entrar com o Google. A entrada pública pode ser ativada temporariamente com
 * AUTH_ALLOW_PUBLIC_GOOGLE_SIGNIN=true; caso contrário o portal continua só por convite.
 */
export type SignInFacts = {
  isAdmin: boolean;
  isMember: boolean;
  wasInvited: boolean;
  hasOpenInvitation: boolean;
};

/** Resultado da política: entrar, aceitar o convite aberto ou recusar. */
export type SignInDecision = "allow" | "accept-invitation" | "deny";

/** Quem pode entrar com o Google: admins, membros e convidados anteriores entram, um convite aberto é aceite, os restantes são recusados. */
export function decideSignIn(facts: SignInFacts): SignInDecision {
  if (facts.isAdmin || facts.isMember || facts.wasInvited) return "allow";
  if (facts.hasOpenInvitation) return "accept-invitation";
  return "deny";
}

/** Indica se a entrada pública com Google está ligada. */
function isPublicGoogleSignInEnabled() {
  return process.env.AUTH_ALLOW_PUBLIC_GOOGLE_SIGNIN?.trim().toLowerCase() === "true";
}

/** Aplica a política de acesso e cria a participação num primeiro login público com Google. */
export async function authorizeGoogleSignIn(input: { email: string; externalId: string; displayName: string | null }) {
  const email = input.email.trim().toLowerCase();
  const now = new Date();

  // Carrega o utilizador e o convite em paralelo.
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

  // Recusa, a não ser que a entrada pública esteja ligada; quem já tem acesso entra sem escrever nada.
  if (decision === "deny" && !isPublicGoogleSignInEnabled()) return false;
  if (decision !== "accept-invitation" && decision !== "deny") return true;

  // Numa só transação: gastar o convite, criar o utilizador e inscrevê-lo no evento.
  await prisma.$transaction(async (tx) => {
    if (invitation && decision === "accept-invitation") {
      await tx.userInvitation.update({ where: { id: invitation.id }, data: { usedAtUtc: now } });
    }

    const invitedUser =
      user ??
      (await tx.user.create({
        data: { email, externalId: input.externalId, displayName: input.displayName ?? email, isAdmin: false },
        select: { id: true, isAdmin: true },
      }));
    // Evento do convite, ou o evento ativo mais antigo no login público.
    const eventId =
      invitation?.eventId ??
      (
        await tx.event.findFirst({
          where: { isActive: true },
          orderBy: { createdAtUtc: "asc" },
          select: { id: true },
        })
      )?.id;
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
