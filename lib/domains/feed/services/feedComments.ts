import { notFound } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";
import type { HubCommentDto } from "@/lib/api/types";
import { PERSON_COLORS } from "@/lib/personColors";

import { assertPostInEvent } from "./feedAccess";
import { loadUsersById } from "@/lib/usersById";

/* Comentários dos posts do feed: a conversa, as respostas, as reações com emoji e o apagar. */

/** Um comentário tal como a rota o endereça: ids do evento, do post e do comentário vindos do URL. */
export type CommentRef = { eventId: string; postId: string; commentId: string };

/** Lança 404 se o comentário não pertencer a este post e evento. */
async function assertCommentInPost({ eventId, postId, commentId }: CommentRef) {
  const comment = await prisma.hubPostComment.findFirst({
    where: { id: commentId, postId, post: { eventId } },
    select: { id: true },
  });
  if (!comment) throw notFound("Comment not found.");
}

/** Os comentários do post, dos mais antigos para os mais recentes, com os nomes dos autores e as reações do utilizador. */
export async function getPostComments(eventId: string, postId: string, userId: string): Promise<HubCommentDto[]> {
  await assertPostInEvent(eventId, postId);
  const comments = await prisma.hubPostComment.findMany({
    where: { postId },
    orderBy: { createdAtUtc: "asc" },
    include: {
      reactions: { select: { userId: true, emoji: true } },
    },
  });

  // Autores carregados de uma só vez.
  const commentUserMap = await loadUsersById(
    comments.map((c) => c.userId),
    (where) => prisma.user.findMany({ where, select: { id: true, displayName: true, color: true } }),
  );

  return comments.map((c) => {
    // Conta as reações por emoji e separa as do utilizador atual.
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
      userName: commentUserMap.get(c.userId)?.displayName ?? "Unknown",
      userColor: commentUserMap.get(c.userId)?.color ?? PERSON_COLORS[0],
      text: c.text,
      createdAtUtc: c.createdAtUtc.toISOString(),
      replyToId: c.replyToId,
      reactionCounts,
      myReactions,
    };
  });
}

/** Acrescenta um comentário, opcionalmente em resposta a outro comentário do mesmo post. */
export async function createComment(
  eventId: string,
  postId: string,
  userId: string,
  { text, replyToId }: { text: string; replyToId?: string | null },
): Promise<HubCommentDto> {
  // O post e o comentário a que se responde têm de ser deste evento.
  await assertPostInEvent(eventId, postId);
  if (replyToId) await assertCommentInPost({ eventId, postId, commentId: replyToId });

  const [comment, author] = await Promise.all([
    prisma.hubPostComment.create({ data: { postId, userId, text: text.trim(), replyToId: replyToId || null } }),
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, color: true } }),
  ]);

  // Um comentário novo ainda não tem reações.
  return {
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    userName: author?.displayName ?? "Unknown",
    userColor: author?.color ?? PERSON_COLORS[0],
    text: comment.text,
    createdAtUtc: comment.createdAtUtc.toISOString(),
    replyToId: comment.replyToId,
    reactionCounts: {},
    myReactions: [],
  };
}

/** Apaga um comentário deste post; só o autor ou um admin pode. Devolve false se não existir ou não for permitido. */
export async function deleteComment(
  { eventId, postId, commentId }: CommentRef,
  user: { id: string; isAdmin: boolean },
): Promise<boolean> {
  const comment = await prisma.hubPostComment.findFirst({ where: { id: commentId, postId, post: { eventId } } });
  if (!comment || (comment.userId !== user.id && !user.isAdmin)) return false;

  await prisma.hubPostComment.delete({ where: { id: commentId } });
  return true;
}

/** Põe ou tira uma reação com emoji do utilizador num comentário. */
export async function toggleCommentReaction(ref: CommentRef, userId: string, emoji: string): Promise<void> {
  await assertCommentInPost(ref);
  const { commentId } = ref;
  const existing = await prisma.hubPostCommentReaction.findFirst({ where: { commentId, userId, emoji } });

  if (existing) {
    await prisma.hubPostCommentReaction.delete({ where: { id: existing.id } }).catch(() => undefined);
  } else {
    // Um P2002 (violação de unicidade) é um duplo toque em simultâneo: já está feito, ignora-se.
    try {
      await prisma.hubPostCommentReaction.create({ data: { commentId, userId, emoji } });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
}
