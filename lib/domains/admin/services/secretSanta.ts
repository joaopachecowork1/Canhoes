import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { EventAdminSecretSantaStateDto } from "@/lib/api/types";
import { HttpError } from "@/lib/api/httpError";
import { drawSecretSanta } from "@/lib/domains/secretSanta/services/draw";

/*
 * Um sorteio começa escondido: o admin pode repeti-lo as vezes que precisar. Revelá-lo bloqueia-o
 * (`isLocked`) e só então os membros veem a quem dão o presente.
 */

/** O código do evento no sorteio (guardado no estado do evento), ou o próprio id do evento. */
async function getEventCode(eventId: string) {
  const state = await prisma.canhoesEventState.findUnique({
    where: { eventId },
    select: { secretSantaEventCode: true },
  });
  return state?.secretSantaEventCode ?? eventId;
}

/** O sorteio mais recente deste código de evento. */
function findLatestDraw(eventCode: string) {
  return prisma.secretSantaDraw.findFirst({ where: { eventCode }, orderBy: { createdAtUtc: "desc" } });
}

/** A vista de admin do Amigo Secreto: código do evento, último sorteio, se está revelado, e a contagem de membros e atribuições. */
export async function getAdminSecretSantaState(eventId: string): Promise<EventAdminSecretSantaStateDto> {
  const eventCode = await getEventCode(eventId);
  const latestDraw = await findLatestDraw(eventCode);

  const [memberCount, assignmentCount] = await Promise.all([
    prisma.eventMember.count({ where: { eventId } }),
    latestDraw ? prisma.secretSantaAssignment.count({ where: { drawId: latestDraw.id } }) : Promise.resolve(0),
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

/** Códigos de erro do sorteio que o cliente sabe tratar. */
type DrawErrorCode = "DRAW_REVEALED" | "NOT_ENOUGH_PARTICIPANTS" | "NO_DRAW";

// Estado HTTP e mensagem de cada erro.
const DRAW_ERRORS: Record<DrawErrorCode, { status: number; message: string }> = {
  DRAW_REVEALED: { status: 409, message: "O sorteio já foi revelado e não pode ser repetido." },
  NOT_ENOUGH_PARTICIPANTS: { status: 400, message: "São precisos pelo menos 2 membros para o sorteio." },
  NO_DRAW: { status: 409, message: "Ainda não há sorteio para revelar." },
};

/** Erro do sorteio, com estado HTTP, código e mensagem em português. */
class SecretSantaDrawError extends HttpError {
  constructor(override readonly code: DrawErrorCode) {
    super(DRAW_ERRORS[code].status, code, DRAW_ERRORS[code].message);
    this.name = "SecretSantaDrawError";
  }
}

// Aleatoriedade criptográfica em [0, 1), para o sorteio não ser previsível.
const secureRandom = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

/** Sorteia (ou volta a sortear) os pares entre os membros do evento. Recusado depois de o sorteio ser revelado. */
export async function executeSecretSantaDraw(
  eventId: string,
  createdByUserId: string,
  eventCode?: string,
): Promise<EventAdminSecretSantaStateDto> {
  const code = eventCode?.trim() || (await getEventCode(eventId));

  // Um sorteio revelado já não se repete.
  if ((await findLatestDraw(code))?.isLocked) throw new SecretSantaDrawError("DRAW_REVEALED");

  // São precisos pelo menos dois participantes.
  const members = await prisma.eventMember.findMany({ where: { eventId }, select: { userId: true } });
  if (new Set(members.map((member) => member.userId)).size < 2) {
    throw new SecretSantaDrawError("NOT_ENOUGH_PARTICIPANTS");
  }
  const pairs = drawSecretSanta(
    members.map((member) => member.userId),
    secureRandom,
  );

  // Numa só transação: apagar o sorteio anterior e gravar o novo, para nunca ficar a meio.
  await prisma.$transaction(async (tx) => {
    // Verifica-se outra vez dentro da transação: uma revelação pode ter chegado depois da verificação acima.
    const previousDraws = await tx.secretSantaDraw.findMany({
      where: { eventCode: code },
      select: { id: true, isLocked: true },
    });
    if (previousDraws.some((previousDraw) => previousDraw.isLocked)) throw new SecretSantaDrawError("DRAW_REVEALED");
    // Substitui o sorteio anterior (atribuições primeiro, por causa da chave estrangeira).
    await tx.secretSantaAssignment.deleteMany({ where: { drawId: { in: previousDraws.map((draw) => draw.id) } } });
    await tx.secretSantaDraw.deleteMany({ where: { eventCode: code } });

    const draw = await tx.secretSantaDraw.create({
      data: { eventCode: code, createdByUserId, isLocked: false },
    });
    await tx.secretSantaAssignment.createMany({
      data: pairs.map((pair) => ({ ...pair, drawId: draw.id })),
    });

    // Guarda o código usado no estado do evento, criando-o se ainda não existir.
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

/** Mostra o sorteio atual aos membros. A partir daí já não se pode repetir. */
export async function revealSecretSantaDraw(eventId: string): Promise<EventAdminSecretSantaStateDto> {
  const latestDraw = await findLatestDraw(await getEventCode(eventId));
  if (!latestDraw) throw new SecretSantaDrawError("NO_DRAW");

  // Bloqueia o sorteio e marca o evento como tendo sorteio, as duas coisas juntas.
  await prisma.$transaction([
    prisma.secretSantaDraw.update({ where: { id: latestDraw.id }, data: { isLocked: true } }),
    prisma.canhoesEventState.update({ where: { eventId }, data: { hasSecretSantaDraw: true } }),
  ]);

  return getAdminSecretSantaState(eventId);
}
