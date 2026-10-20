import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/storage/localStorage";
import type { EventFeedPostFullDto, PagedResult } from "@/lib/api/types";
import { PERSON_COLORS } from "@/lib/personColors";
import { loadUsersById } from "@/lib/usersById";

/*
 * Posts do feed ("mural"): a lista paginada, criar um post com imagens e sondagem, fixar e
 * apagar. As reações estão em `feedReactions.ts` e os comentários em `feedComments.ts`.
 */

// Os campos de um post necessários para montar o DTO do feed.
const POST_SELECT = {
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
async function toFeedPosts(rows: PostRow[], userId: string): Promise<EventFeedPostFullDto[]> {
  // Carrega os detalhes de todos os posts de uma vez e indexa-os por post, em vez de uma query por post.
  const postIds = rows.map((row) => row.id);
  const details = await loadPostDetails(postIds, [...new Set(rows.map((row) => row.authorUserId))]);
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
    };
  });
}

/** Uma página do feed do evento para este utilizador: fixados primeiro, depois os mais recentes, com autor, contagens, reações do utilizador e resultados das sondagens. */
export async function getFeedPosts(
  eventId: string,
  userId: string,
  skip = 0,
  take = 15,
): Promise<PagedResult<EventFeedPostFullDto>> {
  const where = { eventId };

  // Fixados primeiro (pela sua ordem), depois os mais recentes.
  const [total, rows] = await Promise.all([
    prisma.hubPost.count({ where }),
    prisma.hubPost.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { pinnedOrder: "asc" }, { createdAtUtc: "desc" }],
      skip,
      take,
      select: POST_SELECT,
    }),
  ]);

  return { items: await toFeedPosts(rows, userId), total, skip, take, hasMore: skip + take < total };
}

/** Cria um post (e a sua sondagem) e associa-lhe as imagens que o autor enviou. */
export async function createFeedPost(
  eventId: string,
  userId: string,
  data: {
    text: string;
    mediaUrl?: string | null;
    mediaUrls?: string[] | null;
    pollQuestion?: string | null;
    pollOptions?: string[] | null;
  },
): Promise<EventFeedPostFullDto> {
  // Tudo numa transação: post, sondagem e imagens ficam juntos ou não ficam.
  const post = await prisma.$transaction(async (tx) => {
    // Bloqueia a linha do evento para dois posts criados ao mesmo tempo não ficarem com o mesmo número.
    await tx.$queryRaw`SELECT "Id" FROM "Events" WHERE "Id" = ${eventId} FOR UPDATE`;
    const { _max } = await tx.hubPost.aggregate({ where: { eventId }, _max: { number: true } });
    const p = await tx.hubPost.create({
      data: {
        number: (_max.number ?? 0) + 1,
        eventId,
        authorUserId: userId,
        text: data.text.trim(),
        mediaUrl: data.mediaUrl ?? null,
        mediaUrlsJson: data.mediaUrls ?? [],
        isPinned: false,
      },
    });

    // Sondagem opcional, com as opções pela ordem recebida.
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

    // Só liga imagens que este autor enviou e que ainda não pertencem a nenhum post.
    const mediaUrls = data.mediaUrls ?? (data.mediaUrl ? [data.mediaUrl] : []);
    if (mediaUrls.length > 0) {
      await tx.hubPostMedia.updateMany({
        where: { url: { in: mediaUrls }, uploadedByUserId: userId, postId: null },
        data: { postId: p.id },
      });
    }

    return p;
  });

  const [created] = await toFeedPosts([post], userId);
  return created;
}

/** Apaga um post deste evento e as suas imagens; false quando não existe. */
export async function deleteFeedPost(eventId: string, postId: string): Promise<boolean> {
  const post = await prisma.hubPost.findFirst({
    where: { id: postId, eventId },
    include: { media: { select: { url: true } } },
  });
  if (!post) return false;

  // Apaga primeiro o post e só depois os ficheiros, para nunca ficar um post a apontar para imagens que já não existem.
  await prisma.hubPost.delete({ where: { id: postId } });
  await Promise.all(post.media.map((media) => deleteUpload(media.url)));
  return true;
}

/** Número máximo de imagens por post. */
export const MAX_IMAGES_PER_POST = 4;

/** Guarda imagens para um post futuro e regista-as, para o post poder referenciar os URLs. */
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
