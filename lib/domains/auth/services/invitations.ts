import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import { HttpError } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";

// Validade do convite em dias e custo do hash bcrypt.
const INVITATION_TTL_DAYS = 7;
const PASSWORD_HASH_ROUNDS = 10;

/** Códigos de erro que o cliente sabe tratar. */
type InvitationErrorCode = "USER_ALREADY_EXISTS" | "INVALID_INVITATION" | "INVITATION_USED" | "INVITATION_EXPIRED";

const INVITATION_ERROR_MESSAGES: Record<InvitationErrorCode, string> = {
  USER_ALREADY_EXISTS: "Já existe uma conta com este email.",
  INVALID_INVITATION: "Este convite não é válido.",
  INVITATION_USED: "Este convite já foi usado.",
  INVITATION_EXPIRED: "Este convite expirou.",
};

/** Erro de convite: um 400 com código e mensagem em português. */
class InvitationError extends HttpError {
  constructor(override readonly code: InvitationErrorCode) {
    super(400, code, INVITATION_ERROR_MESSAGES[code]);
    this.name = "InvitationError";
  }
}

/**
 * Convida alguém a criar uma conta com email e password. Não há envio de email:
 * o admin recebe o link e partilha-o. Voltar a convidar um email substitui o token anterior.
 */
export async function createInvitation(input: { email: string; eventId: string | null; invitedByUserId: string }) {
  const email = input.email.trim().toLowerCase();
  // Quem já tem conta não precisa de convite.
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) throw new InvitationError("USER_ALREADY_EXISTS");

  // Token aleatório e data de expiração.
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAtUtc = new Date();
  expiresAtUtc.setDate(expiresAtUtc.getDate() + INVITATION_TTL_DAYS);

  // Um convite por email: criar ou substituir, voltando a deixá-lo por usar.
  const invitation = { token, expiresAtUtc, invitedByUserId: input.invitedByUserId, eventId: input.eventId };
  await prisma.userInvitation.upsert({
    where: { email },
    update: { ...invitation, usedAtUtc: null },
    create: { email, ...invitation },
  });

  return { inviteUrl: `/canhoes/register?token=${token}` };
}

/**
 * Cria a conta para um convite válido (ou define a password numa conta existente com esse email)
 * e, se o convite veio de um evento, inscreve o utilizador como participante.
 */
export async function registerWithInvitation(input: { token: string; password: string; displayName: string }) {
  // Validação do convite, antes de gastar tempo a calcular o hash.
  const invitation = await prisma.userInvitation.findUnique({ where: { token: input.token } });
  if (!invitation) throw new InvitationError("INVALID_INVITATION");
  if (invitation.usedAtUtc) throw new InvitationError("INVITATION_USED");
  if (invitation.expiresAtUtc < new Date()) throw new InvitationError("INVITATION_EXPIRED");

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  const email = invitation.email;

  return prisma.$transaction(async (tx) => {
    // Reclamar o convite é a verificação que conta: dois pedidos em simultâneo passam ambos a anterior.
    const claimed = await tx.userInvitation.updateMany({
      where: { id: invitation.id, usedAtUtc: null },
      data: { usedAtUtc: new Date() },
    });
    if (claimed.count === 0) throw new InvitationError("INVITATION_USED");

    // Conta existente só recebe a password; senão cria-se uma nova.
    const existingUser = await tx.user.findUnique({ where: { email } });
    const user = existingUser
      ? await tx.user.update({
          where: { email },
          data: { passwordHash, displayName: existingUser.displayName || input.displayName },
        })
      : await tx.user.create({
          data: {
            email,
            externalId: `credentials:${email}`,
            displayName: input.displayName,
            passwordHash,
            isAdmin: false,
          },
        });

    // Inscreve no evento do convite, sem duplicar se já for membro.
    if (invitation.eventId) {
      await tx.eventMember.upsert({
        where: { eventId_userId: { eventId: invitation.eventId, userId: user.id } },
        update: {},
        create: { eventId: invitation.eventId, userId: user.id, role: "participant", joinedAtUtc: new Date() },
      });
    }

    return { email: user.email, displayName: user.displayName };
  });
}
