import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import { HttpError } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";

const INVITATION_TTL_DAYS = 7;
const PASSWORD_HASH_ROUNDS = 10;

type InvitationErrorCode = "USER_ALREADY_EXISTS" | "INVALID_INVITATION" | "INVITATION_USED" | "INVITATION_EXPIRED";

const INVITATION_ERROR_MESSAGES: Record<InvitationErrorCode, string> = {
  USER_ALREADY_EXISTS: "Já existe uma conta com este email.",
  INVALID_INVITATION: "Este convite não é válido.",
  INVITATION_USED: "Este convite já foi usado.",
  INVITATION_EXPIRED: "Este convite expirou.",
};

class InvitationError extends HttpError {
  constructor(override readonly code: InvitationErrorCode) {
    super(400, code, INVITATION_ERROR_MESSAGES[code]);
    this.name = "InvitationError";
  }
}

/**
 * Invites someone to create an email + password account. There is no email delivery:
 * the admin gets the link and shares it. Re-inviting an email replaces the previous token.
 */
export async function createInvitation(input: { email: string; eventId: string | null; invitedByUserId: string }) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) throw new InvitationError("USER_ALREADY_EXISTS");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAtUtc = new Date();
  expiresAtUtc.setDate(expiresAtUtc.getDate() + INVITATION_TTL_DAYS);

  const invitation = { token, expiresAtUtc, invitedByUserId: input.invitedByUserId, eventId: input.eventId };
  await prisma.userInvitation.upsert({
    where: { email },
    update: { ...invitation, usedAtUtc: null },
    create: { email, ...invitation },
  });

  return { inviteUrl: `/canhoes/register?token=${token}` };
}

/**
 * Creates the account for a valid invitation (or sets a password on an existing account with
 * that email) and, when the invitation came from an event, adds the user as a participant.
 */
export async function registerWithInvitation(input: { token: string; password: string; displayName: string }) {
  const invitation = await prisma.userInvitation.findUnique({ where: { token: input.token } });
  if (!invitation) throw new InvitationError("INVALID_INVITATION");
  if (invitation.usedAtUtc) throw new InvitationError("INVITATION_USED");
  if (invitation.expiresAtUtc < new Date()) throw new InvitationError("INVITATION_EXPIRED");

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  const email = invitation.email;

  return prisma.$transaction(async (tx) => {
    // Claiming the invitation is the check that counts: two simultaneous requests both pass the one above.
    const claimed = await tx.userInvitation.updateMany({
      where: { id: invitation.id, usedAtUtc: null },
      data: { usedAtUtc: new Date() },
    });
    if (claimed.count === 0) throw new InvitationError("INVITATION_USED");

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
