import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { EventAdminSecretSantaStateDto } from "@/lib/api/types";
import { HttpError } from "@/lib/api/httpError";
import { drawSecretSanta } from "@/lib/domains/secretSanta/services/draw";

/*
 * A draw starts hidden: the admin can repeat it as often as needed. Revealing it locks it
 * (`isLocked`) and only then do members see who they give a present to.
 */

async function getEventCode(eventId: string) {
  const state = await prisma.canhoesEventState.findUnique({
    where: { eventId },
    select: { secretSantaEventCode: true },
  });
  return state?.secretSantaEventCode ?? eventId;
}

function findLatestDraw(eventCode: string) {
  return prisma.secretSantaDraw.findFirst({ where: { eventCode }, orderBy: { createdAtUtc: "desc" } });
}

/** The admin view of the secret santa: event code, latest draw, whether it is revealed, member and assignment counts. */
export async function getAdminSecretSantaState(eventId: string): Promise<EventAdminSecretSantaStateDto> {
  const eventCode = await getEventCode(eventId);
  const latestDraw = await findLatestDraw(eventCode);

  const [memberCount, assignmentCount] = await Promise.all([
    prisma.eventMember.count({ where: { eventId } }),
    latestDraw
      ? prisma.secretSantaAssignment.count({ where: { drawId: latestDraw.id } })
      : Promise.resolve(0),
  ]);

  return {
    eventId,
    eventCode,
    hasDraw: !!latestDraw,
    createdAtUtc: latestDraw?.createdAtUtc.toISOString() ?? null,
    isLocked: latestDraw?.isLocked ?? false,
    memberCount,
    assignmentCount,
  };
}

type DrawErrorCode = "DRAW_REVEALED" | "NOT_ENOUGH_PARTICIPANTS" | "NO_DRAW";

const DRAW_ERRORS: Record<DrawErrorCode, { status: number; message: string }> = {
  DRAW_REVEALED: { status: 409, message: "O sorteio já foi revelado e não pode ser repetido." },
  NOT_ENOUGH_PARTICIPANTS: { status: 400, message: "São precisos pelo menos 2 membros para o sorteio." },
  NO_DRAW: { status: 409, message: "Ainda não há sorteio para revelar." },
};

class SecretSantaDrawError extends HttpError {
  constructor(override readonly code: DrawErrorCode) {
    super(DRAW_ERRORS[code].status, code, DRAW_ERRORS[code].message);
    this.name = "SecretSantaDrawError";
  }
}

const secureRandom = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

/** Draws (or redraws) the pairs among the event's members. Refused once the draw was revealed. */
export async function executeSecretSantaDraw(
  eventId: string,
  createdByUserId: string,
  eventCode?: string
): Promise<EventAdminSecretSantaStateDto> {
  const code = eventCode?.trim() || (await getEventCode(eventId));

  if ((await findLatestDraw(code))?.isLocked) throw new SecretSantaDrawError("DRAW_REVEALED");

  const members = await prisma.eventMember.findMany({ where: { eventId }, select: { userId: true } });
  if (new Set(members.map((member) => member.userId)).size < 2) {
    throw new SecretSantaDrawError("NOT_ENOUGH_PARTICIPANTS");
  }
  const pairs = drawSecretSanta(members.map((member) => member.userId), secureRandom);

  await prisma.$transaction(async (tx) => {
    // Checked again inside the transaction: a reveal may have landed since the check above.
    const previousDraws = await tx.secretSantaDraw.findMany({ where: { eventCode: code }, select: { id: true, isLocked: true } });
    if (previousDraws.some((previousDraw) => previousDraw.isLocked)) throw new SecretSantaDrawError("DRAW_REVEALED");
    await tx.secretSantaAssignment.deleteMany({ where: { drawId: { in: previousDraws.map((draw) => draw.id) } } });
    await tx.secretSantaDraw.deleteMany({ where: { eventCode: code } });

    const draw = await tx.secretSantaDraw.create({
      data: { eventCode: code, createdByUserId, isLocked: false },
    });
    await tx.secretSantaAssignment.createMany({
      data: pairs.map((pair) => ({ ...pair, drawId: draw.id })),
    });

    await tx.canhoesEventState.upsert({
      where: { eventId },
      create: {
        eventId,
        phase: "gala",
        nominationsVisible: true,
        resultsVisible: false,
        secretSantaEventCode: code,
      },
      update: { secretSantaEventCode: code },
    });
  });

  return getAdminSecretSantaState(eventId);
}

/** Shows the current draw to the members. From then on it cannot be repeated. */
export async function revealSecretSantaDraw(eventId: string): Promise<EventAdminSecretSantaStateDto> {
  const latestDraw = await findLatestDraw(await getEventCode(eventId));
  if (!latestDraw) throw new SecretSantaDrawError("NO_DRAW");

  await prisma.$transaction([
    prisma.secretSantaDraw.update({ where: { id: latestDraw.id }, data: { isLocked: true } }),
    prisma.canhoesEventState.update({ where: { eventId }, data: { hasSecretSantaDraw: true } }),
  ]);

  return getAdminSecretSantaState(eventId);
}
