import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import type { UserInvitationDto } from "@/lib/api/types";
import type { EventMemberRole } from "@/lib/generated/prisma/client";
import { HttpError } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/services/emailService";

// Validade do convite em dias e custo do hash bcrypt.
const INVITATION_TTL_DAYS = 7;
const PASSWORD_HASH_ROUNDS = 10;

function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

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

export type InvitationRole = "participant" | "admin";

/**
 * Convida alguém a criar uma conta com email e password ou Google. Envia email e devolve o link.
 * Voltar a convidar um email substitui o token anterior e renova o prazo.
 */
export async function createInvitation(input: {
  email: string;
  eventId: string | null;
  invitedByUserId: string;
  role?: InvitationRole;
}) {
  const email = input.email.trim().toLowerCase();
  // Quem já tem conta não precisa de convite.
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) throw new InvitationError("USER_ALREADY_EXISTS");

  const role: EventMemberRole = input.role === "admin" ? "admin" : "participant";
  const isAdmin = role === "admin";

  // Token aleatório e data de expiração.
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAtUtc = new Date();
  expiresAtUtc.setDate(expiresAtUtc.getDate() + INVITATION_TTL_DAYS);

  // Um convite por email: criar ou substituir, voltando a deixá-lo por usar.
  const invitation = {
    token,
    expiresAtUtc,
    invitedByUserId: input.invitedByUserId,
    eventId: input.eventId,
    role,
    isAdmin,
  };
  await prisma.userInvitation.upsert({
    where: { email },
    update: { ...invitation, usedAtUtc: null },
    create: { email, ...invitation },
  });

  const baseUrl = getBaseUrl();
  const fullInviteUrl = `${baseUrl}/canhoes/register?token=${token}`;

  let eventName: string | undefined;
  if (input.eventId) {
    const event = await prisma.event.findUnique({ where: { id: input.eventId }, select: { name: true } });
    eventName = event?.name;
  }

  const emailResult = await sendInvitationEmail({
    to: email,
    inviteUrl: fullInviteUrl,
    role,
    eventName,
  });

  return {
    inviteUrl: `/canhoes/register?token=${token}`,
    fullInviteUrl,
    role,
    isAdmin,
    emailSent: emailResult.sent,
    emailReason: emailResult.reason,
  };
}

/** Lista todos os convites registados, ordenados pelos mais recentes. */
export async function listInvitations(eventId?: string | null): Promise<UserInvitationDto[]> {
  const where = eventId ? { OR: [{ eventId }, { eventId: null }] } : {};
  const invitations = await prisma.userInvitation.findMany({
    where,
    orderBy: { createdAtUtc: "desc" },
  });

  const now = new Date();
  const baseUrl = getBaseUrl();

  return invitations.map((inv) => {
    let status: "pending" | "used" | "expired" = "pending";
    if (inv.usedAtUtc) {
      status = "used";
    } else if (inv.expiresAtUtc < now) {
      status = "expired";
    }

    return {
      id: inv.id,
      email: inv.email,
      role: (inv.role === "admin" ? "admin" : "participant") as "participant" | "admin",
      createdAtUtc: inv.createdAtUtc.toISOString(),
      expiresAtUtc: inv.expiresAtUtc.toISOString(),
      usedAtUtc: inv.usedAtUtc ? inv.usedAtUtc.toISOString() : null,
      status,
      inviteUrl: `${baseUrl}/canhoes/register?token=${inv.token}`,
    };
  });
}

/** Reenvia o email de um convite pendente e renova a sua validade por 7 dias. */
export async function resendInvitation(invitationId: string): Promise<{ emailSent: boolean; emailReason?: string }> {
  const invitation = await prisma.userInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw new InvitationError("INVALID_INVITATION");
  if (invitation.usedAtUtc) throw new InvitationError("INVITATION_USED");

  const expiresAtUtc = new Date();
  expiresAtUtc.setDate(expiresAtUtc.getDate() + INVITATION_TTL_DAYS);

  await prisma.userInvitation.update({
    where: { id: invitation.id },
    data: { expiresAtUtc },
  });

  let eventName: string | undefined;
  if (invitation.eventId) {
    const event = await prisma.event.findUnique({ where: { id: invitation.eventId }, select: { name: true } });
    eventName = event?.name;
  }

  const baseUrl = getBaseUrl();
  const emailResult = await sendInvitationEmail({
    to: invitation.email,
    inviteUrl: `${baseUrl}/canhoes/register?token=${invitation.token}`,
    role: (invitation.role === "admin" ? "admin" : "participant") as "participant" | "admin",
    eventName,
  });

  return { emailSent: emailResult.sent, emailReason: emailResult.reason };
}

/** Revoga e remove um convite pendente. */
export async function revokeInvitation(invitationId: string): Promise<{ success: boolean }> {
  const invitation = await prisma.userInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw new InvitationError("INVALID_INVITATION");

  await prisma.userInvitation.delete({ where: { id: invitation.id } });
  return { success: true };
}

/**
 * Cria a conta para um convite válido (ou define a password numa conta existente com esse email)
 * e, se o convite veio de um evento, inscreve o utilizador como participante ou administrador.
 */
export async function registerWithInvitation(input: { token: string; password: string; displayName: string }) {
  // Validação do convite, antes de gastar tempo a calcular o hash.
  const invitation = await prisma.userInvitation.findUnique({ where: { token: input.token } });
  if (!invitation) throw new InvitationError("INVALID_INVITATION");
  if (invitation.usedAtUtc) throw new InvitationError("INVITATION_USED");
  if (invitation.expiresAtUtc < new Date()) throw new InvitationError("INVITATION_EXPIRED");

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  const email = invitation.email;
  const shouldBeAdmin = Boolean(invitation.isAdmin || invitation.role === "admin");

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
          data: {
            passwordHash,
            displayName: existingUser.displayName || input.displayName,
            ...(shouldBeAdmin ? { isAdmin: true } : {}),
          },
        })
      : await tx.user.create({
          data: {
            email,
            externalId: `credentials:${email}`,
            displayName: input.displayName,
            passwordHash,
            isAdmin: shouldBeAdmin,
          },
        });

    // Inscreve no evento do convite, sem duplicar se já for membro.
    if (invitation.eventId) {
      await tx.eventMember.upsert({
        where: { eventId_userId: { eventId: invitation.eventId, userId: user.id } },
        update: shouldBeAdmin ? { role: "admin" } : {},
        create: {
          eventId: invitation.eventId,
          userId: user.id,
          role: shouldBeAdmin ? "admin" : "participant",
          joinedAtUtc: new Date(),
        },
      });
    }

    return { email: user.email, displayName: user.displayName };
  });
}
