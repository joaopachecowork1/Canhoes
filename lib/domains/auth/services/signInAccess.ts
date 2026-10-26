import { prisma } from "@/lib/prisma";

/**
 * Quem pode entrar com o Google. A entrada pública pode ser ativada temporariamente com
 * AUTH_ALLOW_PUBLIC_GOOGLE_SIGNIN=true; caso contrário o portal continua só por convite.
 */
export type SignInFacts = {
  isAdmin: boolean;
  isMember: boolean;
  hasOpenInvitation: boolean;
};

/** Resultado da política: entrar, aceitar o convite aberto ou recusar. */
export type SignInDecision = "allow" | "accept-invitation" | "deny";

/** Quem pode entrar com o Google: admins e membros entram, um convite aberto é aceite, os restantes (incluindo quem foi removido do evento) são recusados. */
export function decideSignIn(facts: SignInFacts): SignInDecision {
  if (facts.isAdmin || facts.isMember) return "allow";
  if (facts.hasOpenInvitation) return "accept-invitation";
  return "deny";
}

/** Indica se a entrada pública com Google está ligada. */
function isPublicGoogleSignInEnabled() {
  return process.env.AUTH_ALLOW_PUBLIC_GOOGLE_SIGNIN?.trim().toLowerCase() === "true";
}

/** Indica se a conta ainda pode entrar no portal: é admin ou pertence a pelo menos um evento. */
export async function hasPortalAccess(user: { id: string; isAdmin: boolean }) {
  return user.isAdmin || (await prisma.eventMember.count({ where: { userId: user.id } })) > 0;
}

export type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Garante a criação ou elevação a admin do utilizador convidado. */
async function resolveInvitedUser(
  tx: PrismaTx,
  input: { email: string; externalId: string; displayName: string | null },
  existingUser: { id: string; isAdmin: boolean } | null,
  shouldBeAdmin: boolean,
) {
  if (existingUser) {
    if (shouldBeAdmin && !existingUser.isAdmin) {
      return tx.user.update({
        where: { id: existingUser.id },
        data: { isAdmin: true },
        select: { id: true, isAdmin: true },
      });
    }
    return existingUser;
  }

  return tx.user.create({
    data: {
      email: input.email,
      externalId: input.externalId,
      displayName: input.displayName ?? input.email,
      isAdmin: shouldBeAdmin,
    },
    select: { id: true, isAdmin: true },
  });
}

/** Inscreve o utilizador no evento do convite ou, sem evento, no evento ativo mais antigo; devolve-se sem fazer nada se não houver nenhum. */
export async function enrollInTargetEvent(
  tx: PrismaTx,
  userId: string,
  eventId: string | null | undefined,
  shouldBeAdmin: boolean,
) {
  const targetEventId =
    eventId ??
    (
      await tx.event.findFirst({
        where: { isActive: true },
        orderBy: { createdAtUtc: "asc" },
        select: { id: true },
      })
    )?.id;

  if (!targetEventId) return;

  await tx.eventMember.upsert({
    where: { eventId_userId: { eventId: targetEventId, userId } },
    update: shouldBeAdmin ? { role: "admin" } : {},
    create: {
      eventId: targetEventId,
      userId,
      role: shouldBeAdmin ? "admin" : "participant",
      joinedAtUtc: new Date(),
    },
  });
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

    const shouldBeAdmin = Boolean(invitation && (invitation.isAdmin || invitation.role === "admin"));
    const invitedUser = await resolveInvitedUser(tx, { ...input, email }, user, shouldBeAdmin);
    await enrollInTargetEvent(tx, invitedUser.id, invitation?.eventId, shouldBeAdmin);
  });
  return true;
}
