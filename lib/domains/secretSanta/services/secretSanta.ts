import { prisma } from "@/lib/prisma";
import type { EventSecretSantaOverviewDto, EventUserDto } from "@/lib/api/types";

/* What a member sees of the Secret Santa: who they give a present to, once the admin revealed the draw. */

/** The user's Secret Santa assignment and wishlist counts; empty until the admin reveals the draw. */
export async function getOverview(
  eventId: string,
  userId: string
): Promise<EventSecretSantaOverviewDto> {
  const eventCode = await getEventCode(eventId);

  // Members only see a draw once the admin revealed (locked) it.
  const latestDraw = await prisma.secretSantaDraw.findFirst({
    where: { eventCode, isLocked: true },
    orderBy: { createdAtUtc: "desc" },
  });

  if (!latestDraw) {
    return {
      eventId,
      hasDraw: false,
      hasAssignment: false,
      drawEventCode: null,
      assignedUser: null,
      assignedWishlistItemCount: 0,
      myWishlistItemCount: await countMyWishlistItems(eventId, userId),
    };
  }

  const assignment = await prisma.secretSantaAssignment.findFirst({
    where: { drawId: latestDraw.id, giverUserId: userId },
  });

  let assignedUser: EventUserDto | null = null;
  let assignedWishlistItemCount = 0;

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

    assignedWishlistItemCount = await prisma.wishlistItem.count({
      where: { eventId, userId: assignment.receiverUserId },
    });
  }

  return {
    eventId,
    hasDraw: true,
    hasAssignment: !!assignment,
    drawEventCode: latestDraw.eventCode,
    assignedUser,
    assignedWishlistItemCount,
    myWishlistItemCount: await countMyWishlistItems(eventId, userId),
  };
}

async function getEventCode(eventId: string): Promise<string> {
  const state = await prisma.canhoesEventState.findUnique({
    where: { eventId },
    select: { secretSantaEventCode: true },
  });
  return state?.secretSantaEventCode ?? eventId;
}

async function countMyWishlistItems(eventId: string, userId: string): Promise<number> {
  return prisma.wishlistItem.count({ where: { eventId, userId } });
}
