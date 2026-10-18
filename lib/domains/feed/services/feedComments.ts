import { notFound } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";
import type { HubCommentDto } from "@/lib/api/types";

import { assertPostInEvent } from "./feedAccess";

/* Comments of feed posts: the thread, replies, emoji reactions and deleting. */

/** A comment as the route addresses it: event, post and comment ids from the URL. */
export type CommentRef = { eventId: string; postId: string; commentId: string };

async function assertCommentInPost({ eventId, postId, commentId }: CommentRef) {
  const comment = await prisma.hubPostComment.findFirst({
    where: { id: commentId, postId, post: { eventId } },
    select: { id: true },
  });
  if (!comment) throw notFound("Comment not found.");
}

/** The post's comments, oldest first, with author names and the user's reactions. */
export async function getPostComments(
  eventId: string,
  postId: string,
  userId: string
): Promise<HubCommentDto[]> {
  await assertPostInEvent(eventId, postId);
  const comments = await prisma.hubPostComment.findMany({
    where: { postId },
    orderBy: { createdAtUtc: "asc" },
    include: {
      reactions: { select: { userId: true, emoji: true } },
    },
  });

  const commentUserIds = [...new Set(comments.map((c) => c.userId))];
  const commentUsers = commentUserIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: commentUserIds } }, select: { id: true, displayName: true } })
    : [];
  const commentUserMap = new Map(commentUsers.map((u) => [u.id, u.displayName]));

  return comments.map((c) => {
    const reactionCounts: Record<string, number> = {};
    const myReactions: string[] = [];
    for (const r of c.reactions) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
      if (r.userId === userId) myReactions.push(r.emoji);
    }

    return {
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      userName: commentUserMap.get(c.userId) ?? "Unknown",
      text: c.text,
      createdAtUtc: c.createdAtUtc.toISOString(),
      replyToId: c.replyToId,
      reactionCounts,
      myReactions,
    };
  });
}

/** Adds a comment, optionally replying to another comment of the same post. */
export async function createComment(
  eventId: string,
  postId: string,
  userId: string,
  { text, replyToId }: { text: string; replyToId?: string | null }
): Promise<HubCommentDto> {
  await assertPostInEvent(eventId, postId);
  if (replyToId) await assertCommentInPost({ eventId, postId, commentId: replyToId });

  const [comment, author] = await Promise.all([
    prisma.hubPostComment.create({ data: { postId, userId, text: text.trim(), replyToId: replyToId || null } }),
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
  ]);

  return {
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    userName: author?.displayName ?? "Unknown",
    text: comment.text,
    createdAtUtc: comment.createdAtUtc.toISOString(),
    replyToId: comment.replyToId,
    reactionCounts: {},
    myReactions: [],
  };
}

/** Deletes a comment of this post; only its author or an admin may. False when not found or not allowed. */
export async function deleteComment(
  { eventId, postId, commentId }: CommentRef,
  user: { id: string; isAdmin: boolean }
): Promise<boolean> {
  const comment = await prisma.hubPostComment.findFirst({ where: { id: commentId, postId, post: { eventId } } });
  if (!comment || (comment.userId !== user.id && !user.isAdmin)) return false;

  await prisma.hubPostComment.delete({ where: { id: commentId } });
  return true;
}

/** Adds or removes one emoji reaction of the user on a comment. */
export async function toggleCommentReaction(ref: CommentRef, userId: string, emoji: string): Promise<void> {
  await assertCommentInPost(ref);
  const { commentId } = ref;
  const existing = await prisma.hubPostCommentReaction.findFirst({ where: { commentId, userId, emoji } });

  if (existing) {
    await prisma.hubPostCommentReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.hubPostCommentReaction.create({ data: { commentId, userId, emoji } });
  }
}
