import { notFound } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/storage/localStorage";
import type {
  EventFeedPostFullDto,
  EventFeedPollDto,
  HubCommentDto,
  PagedResult,
} from "@/lib/api/types";

type PostRow = {
  id: string;
  eventId: string;
  authorUserId: string;
  text: string;
  mediaUrl: string | null;
  mediaUrlsJson: unknown;
  isPinned: boolean;
  pinnedOrder: number | null;
  createdAtUtc: Date;
};

/** Every post-level action is scoped to the event in the URL: a post from another event is a 404. */
async function assertPostInEvent(eventId: string, postId: string) {
  const post = await prisma.hubPost.findFirst({ where: { id: postId, eventId }, select: { id: true } });
  if (!post) throw notFound("Post not found.");
}

async function assertCommentInPost(eventId: string, postId: string, commentId: string) {
  const comment = await prisma.hubPostComment.findFirst({
    where: { id: commentId, postId, post: { eventId } },
    select: { id: true },
  });
  if (!comment) throw notFound("Comment not found.");
}

async function fetchPollForPost(postId: string, userId: string): Promise<EventFeedPollDto | null> {
  const poll = await prisma.hubPostPoll.findUnique({
    where: { postId },
    include: { options: true },
  });
  if (!poll) return null;

  const optionIds = poll.options.map((o) => o.id);
  const votes = optionIds.length > 0
    ? await prisma.hubPostPollVote.findMany({ where: { optionId: { in: optionIds } } })
    : [];

  const votesByOption = new Map<string, typeof votes>();
  for (const v of votes) {
    const arr = votesByOption.get(v.optionId) ?? [];
    arr.push(v);
    votesByOption.set(v.optionId, arr);
  }

  const totalVotes = votes.length;
  const myVote = votes.find((v) => v.userId === userId);

  return {
    question: poll.question,
    totalVotes,
    myOptionId: myVote?.optionId ?? null,
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      voteCount: votesByOption.get(o.id)?.length ?? 0,
    })),
  };
}

async function fetchReactions(postId: string, userId: string) {
  const reactions = await prisma.hubPostReaction.findMany({
    where: { postId },
    select: { userId: true, emoji: true },
  });

  const reactionCounts: Record<string, number> = {};
  const myReactions: string[] = [];
  for (const r of reactions) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
    if (r.userId === userId) myReactions.push(r.emoji);
  }

  return { reactionCounts, myReactions, likedByMe: reactions.some((r) => r.userId === userId && r.emoji === "heart") };
}

async function enrichPost(post: PostRow, userId: string): Promise<EventFeedPostFullDto> {
  const author = await prisma.user.findUnique({
    where: { id: post.authorUserId },
    select: { displayName: true },
  });

  const [downvotes, commentCount, likeCount, poll, { reactionCounts, myReactions, likedByMe }] = await Promise.all([
    prisma.hubPostDownvote.count({ where: { postId: post.id } }),
    prisma.hubPostComment.count({ where: { postId: post.id } }),
    prisma.hubPostReaction.count({ where: { postId: post.id, emoji: "heart" } }),
    fetchPollForPost(post.id, userId),
    fetchReactions(post.id, userId),
  ]);

  const downvotedByMe = await prisma.hubPostDownvote
    .count({ where: { postId: post.id, userId } })
    .then((c) => c > 0);

  return {
    id: post.id,
    eventId: post.eventId,
    authorUserId: post.authorUserId,
    authorName: author?.displayName ?? "Unknown",
    text: post.text,
    mediaUrl: post.mediaUrl,
    mediaUrls: Array.isArray(post.mediaUrlsJson) ? post.mediaUrlsJson as string[] : [],
    isPinned: post.isPinned,
    pinnedOrder: post.pinnedOrder,
    createdAtUtc: post.createdAtUtc.toISOString(),
    likeCount,
    commentCount,
    downvoteCount: downvotes,
    reactionCounts,
    myReactions,
    likedByMe,
    downvotedByMe,
    poll,
  };
}

export async function getFeedPosts(
  eventId: string,
  userId: string,
  skip = 0,
  take = 15
): Promise<PagedResult<EventFeedPostFullDto>> {
  const where = { eventId };
  const [total, rows] = await Promise.all([
    prisma.hubPost.count({ where }),
    prisma.hubPost.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { pinnedOrder: "asc" }, { createdAtUtc: "desc" }],
      skip,
      take,
      select: {
        id: true, eventId: true, authorUserId: true, text: true,
        mediaUrl: true, mediaUrlsJson: true, isPinned: true, pinnedOrder: true, createdAtUtc: true,
      },
    }),
  ]);

  const postIds = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.authorUserId))];
  const [authors, comments, downvotes, reactions, polls] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, displayName: true },
    }),
    prisma.hubPostComment.groupBy({
      by: ["postId"], where: { postId: { in: postIds } }, _count: { _all: true },
    }),
    prisma.hubPostDownvote.findMany({
      where: { postId: { in: postIds } }, select: { postId: true, userId: true },
    }),
    prisma.hubPostReaction.findMany({
      where: { postId: { in: postIds } }, select: { postId: true, userId: true, emoji: true },
    }),
    prisma.hubPostPoll.findMany({
      where: { postId: { in: postIds } },
      include: { options: { orderBy: { sortOrder: "asc" } }, votes: true },
    }),
  ]);

  const authorMap = new Map(authors.map((author) => [author.id, author.displayName]));
  const commentCountMap = new Map(comments.map((entry) => [entry.postId, entry._count._all]));
  const pollMap = new Map(polls.map((poll) => [poll.postId, poll]));

  const items = rows.map((post): EventFeedPostFullDto => {
    const postDownvotes = downvotes.filter((entry) => entry.postId === post.id);
    const postReactions = reactions.filter((entry) => entry.postId === post.id);
    const reactionCounts: Record<string, number> = {};
    const myReactions: string[] = [];
    for (const reaction of postReactions) {
      reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] ?? 0) + 1;
      if (reaction.userId === userId) myReactions.push(reaction.emoji);
    }

    const pollRow = pollMap.get(post.id);
    const poll = pollRow ? {
      question: pollRow.question,
      totalVotes: pollRow.votes.length,
      myOptionId: pollRow.votes.find((vote) => vote.userId === userId)?.optionId ?? null,
      options: pollRow.options.map((option) => ({
        id: option.id,
        text: option.text,
        voteCount: pollRow.votes.filter((vote) => vote.optionId === option.id).length,
      })),
    } : null;

    return {
      id: post.id,
      eventId: post.eventId,
      authorUserId: post.authorUserId,
      authorName: authorMap.get(post.authorUserId) ?? "Unknown",
      text: post.text,
      mediaUrl: post.mediaUrl,
      mediaUrls: Array.isArray(post.mediaUrlsJson) ? post.mediaUrlsJson as string[] : [],
      isPinned: post.isPinned,
      pinnedOrder: post.pinnedOrder,
      createdAtUtc: post.createdAtUtc.toISOString(),
      likeCount: reactionCounts.heart ?? 0,
      commentCount: commentCountMap.get(post.id) ?? 0,
      downvoteCount: postDownvotes.length,
      reactionCounts,
      myReactions,
      likedByMe: myReactions.includes("heart"),
      downvotedByMe: postDownvotes.some((entry) => entry.userId === userId),
      poll,
    };
  });

  return { items, total, skip, take, hasMore: skip + take < total };
}

export async function createFeedPost(
  eventId: string,
  userId: string,
  data: {
    text: string;
    mediaUrl?: string | null;
    mediaUrls?: string[] | null;
    pollQuestion?: string | null;
    pollOptions?: string[] | null;
  }
): Promise<EventFeedPostFullDto> {
  const post = await prisma.$transaction(async (tx) => {
    const p = await tx.hubPost.create({
      data: {
        eventId,
        authorUserId: userId,
        text: data.text.trim(),
        mediaUrl: data.mediaUrl ?? null,
        mediaUrlsJson: data.mediaUrls ?? [],
        isPinned: false,
      },
    });

    if (data.pollQuestion) {
      await tx.hubPostPoll.create({
        data: {
          postId: p.id,
          question: data.pollQuestion.trim(),
          options: {
            create: (data.pollOptions ?? []).map((opt, i) => ({
              text: opt.trim(),
              sortOrder: i,
            })),
          },
        },
      });
    }

    const mediaUrls = data.mediaUrls ?? (data.mediaUrl ? [data.mediaUrl] : []);
    if (mediaUrls.length > 0) {
      await tx.hubPostMedia.updateMany({
        where: { url: { in: mediaUrls }, uploadedByUserId: userId, postId: null },
        data: { postId: p.id },
      });
    }

    return p;
  });

  return enrichPost(post, userId);
}

export async function toggleLike(
  eventId: string,
  postId: string,
  userId: string
): Promise<void> {
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

export async function toggleDownvote(
  eventId: string,
  postId: string,
  userId: string
): Promise<void> {
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

export async function toggleReaction(
  eventId: string,
  postId: string,
  userId: string,
  emoji: string
): Promise<void> {
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

export async function createComment(
  eventId: string,
  postId: string,
  userId: string,
  text: string,
  replyToId?: string | null
): Promise<HubCommentDto> {
  await assertPostInEvent(eventId, postId);
  if (replyToId) await assertCommentInPost(eventId, postId, replyToId);
  const comment = await prisma.hubPostComment.create({
    data: { postId, userId, text: text.trim(), replyToId: replyToId || null },
    include: {
      reactions: { select: { userId: true, emoji: true } },
    },
  });

  const commentAuthor = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  return {
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    userName: commentAuthor?.displayName ?? "Unknown",
    text: comment.text,
    createdAtUtc: comment.createdAtUtc.toISOString(),
    replyToId: comment.replyToId,
    reactionCounts: {},
    myReactions: [],
  };
}

export async function deleteComment(
  eventId: string,
  postId: string,
  commentId: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const comment = await prisma.hubPostComment.findFirst({
    where: { id: commentId, postId, post: { eventId } },
  });

  if (!comment) return false;
  if (comment.userId !== userId && !isAdmin) return false;

  await prisma.hubPostComment.delete({ where: { id: commentId } });
  return true;
}

export async function toggleCommentReaction(
  eventId: string,
  postId: string,
  commentId: string,
  userId: string,
  emoji: string
): Promise<void> {
  await assertCommentInPost(eventId, postId, commentId);
  const existing = await prisma.hubPostCommentReaction.findFirst({
    where: { commentId, userId, emoji },
  });

  if (existing) {
    await prisma.hubPostCommentReaction.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.hubPostCommentReaction.create({
      data: { commentId, userId, emoji },
    });
  }
}

export async function votePoll(
  eventId: string,
  postId: string,
  userId: string,
  optionId: string
): Promise<void> {
  await assertPostInEvent(eventId, postId);
  const option = await prisma.hubPostPollOption.findFirst({ where: { id: optionId, postId }, select: { id: true } });
  if (!option) throw notFound("Poll option not found.");

  const existing = await prisma.hubPostPollVote.findFirst({
    where: { postId, userId },
  });

  if (existing) {
    if (existing.optionId === optionId) {
      await prisma.hubPostPollVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.hubPostPollVote.update({
        where: { id: existing.id },
        data: { optionId },
      });
    }
  } else {
    await prisma.hubPostPollVote.create({
      data: { postId, userId, optionId },
    });
  }
}

export async function togglePin(
  eventId: string,
  postId: string
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

export async function movePinnedPost(
  eventId: string,
  postId: string,
  direction: "up" | "down"
): Promise<boolean> {
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
      })
    );
    return true;
  });
}

export async function deleteFeedPost(
  eventId: string,
  postId: string
): Promise<boolean> {
  const post = await prisma.hubPost.findFirst({
    where: { id: postId, eventId },
    include: { media: { select: { url: true } } },
  });
  if (!post) return false;

  await prisma.hubPost.delete({ where: { id: postId } });
  await Promise.all(post.media.map((media) => deleteUpload(media.url)));
  return true;
}

export const MAX_IMAGES_PER_POST = 4;

/** Stores images for a future post and records them, so the post can reference their URLs. */
export async function saveFeedImages(eventId: string, userId: string, files: File[]) {
  const uploads = await Promise.all(files.map((file) => saveUpload(file, ["feed", eventId])));
  await prisma.hubPostMedia.createMany({
    data: uploads.map((upload) => ({
      url: upload.url,
      originalFileName: upload.fileName,
      fileSizeBytes: BigInt(upload.fileSize),
      uploadedByUserId: userId,
      contentType: upload.contentType,
      uploadedAtUtc: new Date(),
    })),
  });
  return uploads.map(({ url, fileName, fileSize }) => ({ url, fileName, fileSize }));
}
