import { prisma } from "@/lib/prisma";
import type { EventFeedPostFullDto } from "@/lib/api/types";
import { PERSON_COLORS } from "@/lib/personColors";
import { loadUsersById } from "@/lib/usersById";
import { loadGatheringsForPosts } from "@/lib/domains/gatherings/services/gatheringService";

// Os campos de um post necessários para montar o DTO do feed.
export const POST_SELECT = {
  id: true,
  eventId: true,
  authorUserId: true,
  text: true,
  mediaUrl: true,
  mediaUrlsJson: true,
  isPinned: true,
  pinnedOrder: true,
  createdAtUtc: true,
  number: true,
} as const;

/** Um post tal como vem da BD, com os campos de POST_SELECT. */
export type PostRow = {
  id: string;
  eventId: string;
  authorUserId: string;
  text: string;
  mediaUrl: string | null;
  mediaUrlsJson: unknown;
  isPinned: boolean;
  pinnedOrder: number | null;
  createdAtUtc: Date;
  number: number;
};

/** Uma sondagem com opções e votos, como `loadPostDetails` a devolve. */
type PollRow = Awaited<ReturnType<typeof loadPostDetails>>["polls"][number];

/** Autores, contagem de comentários, votos negativos, reações e sondagens destes posts, numa query cada. */
async function loadPostDetails(postIds: string[], authorIds: string[]) {
  const [authors, comments, downvotes, reactions, polls] = await Promise.all([
    loadUsersById(authorIds, (where) =>
      prisma.user.findMany({ where, select: { id: true, displayName: true, color: true } }),
    ),
    prisma.hubPostComment.groupBy({ by: ["postId"], where: { postId: { in: postIds } }, _count: { _all: true } }),
    prisma.hubPostDownvote.findMany({ where: { postId: { in: postIds } }, select: { postId: true, userId: true } }),
    prisma.hubPostReaction.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true, userId: true, emoji: true },
    }),
    prisma.hubPostPoll.findMany({
      where: { postId: { in: postIds } },
      include: { options: { orderBy: { sortOrder: "asc" } }, votes: true },
    }),
  ]);
  return { authors, comments, downvotes, reactions, polls };
}

/** Contagem de reações por emoji e os emojis com que este utilizador reagiu. */
function countReactions(reactions: { userId: string; emoji: string }[], userId: string) {
  const reactionCounts: Record<string, number> = {};
  const myReactions: string[] = [];
  for (const reaction of reactions) {
    reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] ?? 0) + 1;
    if (reaction.userId === userId) myReactions.push(reaction.emoji);
  }
  return { reactionCounts, myReactions };
}

/** Uma sondagem com a contagem de votos e a escolha deste utilizador. */
function toPollDto(poll: PollRow, userId: string) {
  return {
    question: poll.question,
    totalVotes: poll.votes.length,
    myOptionId: poll.votes.find((vote) => vote.userId === userId)?.optionId ?? null,
    options: poll.options.map((option) => ({
      id: option.id,
      text: option.text,
      voteCount: poll.votes.filter((vote) => vote.optionId === option.id).length,
    })),
  };
}

/** Os DTOs do feed destes posts como este utilizador os vê (um coração é um gosto). */
export async function toFeedPosts(rows: PostRow[], userId: string): Promise<EventFeedPostFullDto[]> {
  // Carrega os detalhes de todos os posts de uma vez e indexa-os por post, em vez de uma query por post.
  const postIds = rows.map((row) => row.id);
  const [details, gatherings] = await Promise.all([
    loadPostDetails(postIds, [...new Set(rows.map((row) => row.authorUserId))]),
    loadGatheringsForPosts(postIds, userId),
  ]);
  const { authors } = details;
  const commentCounts = new Map(details.comments.map((entry) => [entry.postId, entry._count._all]));
  const polls = new Map(details.polls.map((poll) => [poll.postId, poll]));

  return rows.map((post) => {
    const postDownvotes = details.downvotes.filter((entry) => entry.postId === post.id);
    const { reactionCounts, myReactions } = countReactions(
      details.reactions.filter((entry) => entry.postId === post.id),
      userId,
    );
    const poll = polls.get(post.id);
    return {
      id: post.id,
      eventId: post.eventId,
      authorUserId: post.authorUserId,
      authorName: authors.get(post.authorUserId)?.displayName ?? "Unknown",
      postNumber: post.number,
      authorColor: authors.get(post.authorUserId)?.color ?? PERSON_COLORS[0],
      text: post.text,
      mediaUrl: post.mediaUrl,
      mediaUrls: Array.isArray(post.mediaUrlsJson)
        ? post.mediaUrlsJson.filter((url): url is string => typeof url === "string")
        : [],
      isPinned: post.isPinned,
      pinnedOrder: post.pinnedOrder,
      createdAtUtc: post.createdAtUtc.toISOString(),
      likeCount: reactionCounts.heart ?? 0,
      commentCount: commentCounts.get(post.id) ?? 0,
      downvoteCount: postDownvotes.length,
      reactionCounts,
      myReactions,
      likedByMe: myReactions.includes("heart"),
      downvotedByMe: postDownvotes.some((entry) => entry.userId === userId),
      poll: poll ? toPollDto(poll, userId) : null,
      gathering: gatherings.get(post.id) ?? null,
    };
  });
}
