import { notFound } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";

import { assertPostInEvent } from "./feedAccess";

/* What members do to a feed post: hearts (likes), downvotes, emoji reactions and poll votes. */

/** Adds or removes the user's heart on a post; liking removes their downvote. */
export async function toggleLike(eventId: string, postId: string, userId: string): Promise<void> {
  await assertPostInEvent(eventId, postId);
  const existing = await prisma.hubPostReaction.findFirst({
    where: { postId, userId, emoji: "heart" },
  });

  if (existing) {
    await prisma.hubPostReaction.delete({ where: { id: existing.id } });
  } else {
    try {
      await prisma.hubPostDownvote.deleteMany({ where: { postId, userId } });
      await prisma.hubPostReaction.create({
        data: { postId, userId, emoji: "heart" },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
}

/** Adds or removes the user's downvote on a post; downvoting removes their heart. */
export async function toggleDownvote(eventId: string, postId: string, userId: string): Promise<void> {
  await assertPostInEvent(eventId, postId);
  const existing = await prisma.hubPostDownvote.findFirst({
    where: { postId, userId },
  });

  if (existing) {
    await prisma.hubPostDownvote.delete({ where: { id: existing.id } });
  } else {
    try {
      await prisma.hubPostReaction.deleteMany({ where: { postId, userId, emoji: "heart" } });
      await prisma.hubPostDownvote.create({
        data: { postId, userId },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
}

/** Adds or removes one emoji reaction of the user on a post. */
export async function toggleReaction(eventId: string, postId: string, userId: string, emoji: string): Promise<void> {
  await assertPostInEvent(eventId, postId);
  const existing = await prisma.hubPostReaction.findFirst({
    where: { postId, userId, emoji },
  });

  if (existing) {
    await prisma.hubPostReaction.delete({ where: { id: existing.id } });
  } else {
    try {
      await prisma.hubPostReaction.create({
        data: { postId, userId, emoji },
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
}

/** Votes for a poll option; voting again for the same option removes the vote, another option replaces it. */
export async function votePoll(eventId: string, postId: string, userId: string, optionId: string): Promise<void> {
  await assertPostInEvent(eventId, postId);
  const option = await prisma.hubPostPollOption.findFirst({ where: { id: optionId, postId }, select: { id: true } });
  if (!option) throw notFound("Poll option not found.");

  // Voting again for the same option removes the vote; any other option becomes the member's vote.
  // Each step is one statement (the upsert is an INSERT ... ON CONFLICT), so overlapping taps can't
  // trip over a row another request just deleted or created.
  const removed = await prisma.hubPostPollVote.deleteMany({ where: { postId, userId, optionId } });
  if (removed.count > 0) return;

  await prisma.hubPostPollVote.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId, optionId },
    update: { optionId },
  });
}
