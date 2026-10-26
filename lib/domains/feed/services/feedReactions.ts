import { notFound } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";

import { assertPostInEvent } from "./feedAccess";

/* O que os membros fazem a um post do feed: corações (gostos), votos negativos, reações com emoji e votos em sondagens. */

/** Põe ou tira o coração do utilizador num post (gostar tira o voto negativo) e devolve se o post ficou gostado. */
export async function toggleLike(eventId: string, postId: string, userId: string): Promise<boolean> {
  await assertPostInEvent(eventId, postId);
  const existing = await prisma.hubPostReaction.findFirst({
    where: { postId, userId, emoji: "heart" },
  });

  if (existing) {
    await prisma.hubPostReaction.delete({ where: { id: existing.id } });
    return false;
  }

  // Um P2002 (violação de unicidade) é um duplo toque em simultâneo: já está feito, ignora-se.
  try {
    await prisma.hubPostDownvote.deleteMany({ where: { postId, userId } });
    await prisma.hubPostReaction.create({
      data: { postId, userId, emoji: "heart" },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
  return true;
}

/** Põe ou tira o voto negativo do utilizador num post (votar contra tira o coração) e devolve se ficou votado contra. */
export async function toggleDownvote(eventId: string, postId: string, userId: string): Promise<boolean> {
  await assertPostInEvent(eventId, postId);
  const existing = await prisma.hubPostDownvote.findFirst({
    where: { postId, userId },
  });

  if (existing) {
    await prisma.hubPostDownvote.delete({ where: { id: existing.id } });
    return false;
  }

  // Um P2002 (violação de unicidade) é um duplo toque em simultâneo: ignora-se.
  try {
    await prisma.hubPostReaction.deleteMany({ where: { postId, userId, emoji: "heart" } });
    await prisma.hubPostDownvote.create({
      data: { postId, userId },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
  return true;
}

/** Põe ou tira uma reação com emoji do utilizador num post. */
export async function toggleReaction(eventId: string, postId: string, userId: string, emoji: string): Promise<void> {
  await assertPostInEvent(eventId, postId);
  const existing = await prisma.hubPostReaction.findFirst({
    where: { postId, userId, emoji },
  });

  if (existing) {
    await prisma.hubPostReaction.delete({ where: { id: existing.id } });
  } else {
    // Um P2002 (violação de unicidade) é um duplo toque em simultâneo: ignora-se.
    try {
      await prisma.hubPostReaction.create({
        data: { postId, userId, emoji },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
}

/** Vota numa opção de sondagem; votar outra vez na mesma opção retira o voto, outra opção substitui-o. */
export async function votePoll(eventId: string, postId: string, userId: string, optionId: string): Promise<void> {
  await assertPostInEvent(eventId, postId);
  // A opção tem de pertencer a este post.
  const option = await prisma.hubPostPollOption.findFirst({ where: { id: optionId, postId }, select: { id: true } });
  if (!option) throw notFound("Poll option not found.");

  // Votar outra vez na mesma opção retira o voto; qualquer outra opção passa a ser o voto do membro.
  // Cada passo é uma só instrução (o upsert é um INSERT ... ON CONFLICT), por isso toques sobrepostos
  // não tropeçam numa linha que outro pedido acabou de apagar ou criar.
  const removed = await prisma.hubPostPollVote.deleteMany({ where: { postId, userId, optionId } });
  if (removed.count > 0) return;

  await prisma.hubPostPollVote.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId, optionId },
    update: { optionId },
  });
}
