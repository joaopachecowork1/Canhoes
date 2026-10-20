import { prisma } from "@/lib/prisma";

/** Pins a post at the end of the pinned list, or unpins it; null when the post is not in this event. */
export async function togglePin(
  eventId: string,
  postId: string,
): Promise<{ pinned: boolean; pinnedOrder: number | null } | null> {
  return prisma.$transaction(async (tx) => {
    const post = await tx.hubPost.findFirst({
      where: { id: postId, eventId },
      select: { isPinned: true },
    });
    if (!post) return null;

    const pinned = !post.isPinned;
    const lastPinned = pinned
      ? await tx.hubPost.findFirst({
          where: { eventId, isPinned: true },
          orderBy: { pinnedOrder: "desc" },
          select: { pinnedOrder: true },
        })
      : null;
    const pinnedOrder = pinned ? (lastPinned?.pinnedOrder ?? -1) + 1 : null;

    await tx.hubPost.update({
      where: { id: postId },
      data: { isPinned: pinned, pinnedOrder },
    });

    return { pinned, pinnedOrder };
  });
}

/** Swaps a pinned post with its neighbour above or below; false when the post is not pinned. */
export async function movePinnedPost(eventId: string, postId: string, direction: "up" | "down"): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const pinnedPosts = await tx.hubPost.findMany({
      where: { eventId, isPinned: true },
      orderBy: [{ pinnedOrder: "asc" }, { createdAtUtc: "asc" }],
      select: { id: true },
    });
    const index = pinnedPosts.findIndex((post) => post.id === postId);
    if (index < 0) return false;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pinnedPosts.length) return true;

    await Promise.all(
      pinnedPosts.map((post, position) => {
        let pinnedOrder = position;
        if (position === index) pinnedOrder = targetIndex;
        if (position === targetIndex) pinnedOrder = index;
        return tx.hubPost.update({ where: { id: post.id }, data: { pinnedOrder } });
      }),
    );
    return true;
  });
}
