import { prisma } from "@/lib/prisma";
import type { EventSecretSantaOverviewDto, EventUserDto } from "@/lib/api/types";

/* O que o membro vê do Amigo Secreto: a quem dá o presente, depois de o admin revelar o sorteio. */

/** A atribuição do Amigo Secreto do utilizador e a contagem de desejos; vazia até o admin revelar o sorteio. */
export async function getOverview(eventId: string, userId: string): Promise<EventSecretSantaOverviewDto> {
  const eventCode = await getEventCode(eventId);

  // Os membros só veem um sorteio depois de o admin o revelar (bloquear).
  const latestDraw = await prisma.secretSantaDraw.findFirst({
    where: { eventCode, isLocked: true },
    orderBy: { createdAtUtc: "desc" },
  });

  if (!latestDraw) {
    return {
      eventId,
      hasDraw: false,
      hasAssignment: false,
      assignedUser: null,
      myWishlistItemCount: await countMyWishlistItems(eventId, userId),
    };
  }

  // A pessoa a quem este utilizador dá o presente.
  const assignment = await prisma.secretSantaAssignment.findFirst({
    where: { drawId: latestDraw.id, giverUserId: userId },
  });

  let assignedUser: EventUserDto | null = null;

  if (assignment) {
    const targetUser = await prisma.user.findUnique({
      where: { id: assignment.receiverUserId },
      select: { id: true, displayName: true, email: true },
    });

    if (targetUser) {
      assignedUser = {
        id: targetUser.id,
        name: targetUser.displayName ?? targetUser.email,
        role: "user",
      };
    }
  }

  return {
    eventId,
    hasDraw: true,
    hasAssignment: !!assignment,
    assignedUser,
    myWishlistItemCount: await countMyWishlistItems(eventId, userId),
  };
}

/** O código do evento no sorteio (guardado no estado do evento), ou o próprio id do evento. */
async function getEventCode(eventId: string): Promise<string> {
  const state = await prisma.canhoesEventState.findUnique({
    where: { eventId },
    select: { secretSantaEventCode: true },
  });
  return state?.secretSantaEventCode ?? eventId;
}

/** Quantos itens o utilizador tem na sua lista de desejos. */
async function countMyWishlistItems(eventId: string, userId: string): Promise<number> {
  return prisma.wishlistItem.count({ where: { eventId, userId } });
}
