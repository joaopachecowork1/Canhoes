import type { EventFeedPostFullDto, HubCommentDto } from "@/lib/api/types";
import { HEART_REACTION } from "@/lib/reactions";

/*
 * Alterações otimistas a uma publicação, aplicadas ao feed em cache antes de o servidor responder.
 * Gostos e não-gostos anulam-se mutuamente, tal como no servidor.
 */

// Soma ou subtrai um a um contador, sem nunca ficar abaixo de zero.
const step = (count: number, isAdding: boolean) => Math.max(0, count + (isAdding ? 1 : -1));

/** Cópia da lista com o valor presente ou ausente, sem duplicados. */
function toggleInSet(values: readonly string[], value: string, isOn: boolean) {
  const next = new Set(values);
  if (isOn) next.add(value);
  else next.delete(value);
  return Array.from(next);
}

/** A publicação depois de o utilizador alternar uma reação com emoji; um coração conta também como gosto e anula um não-gosto. */
export function applyPostReaction(post: EventFeedPostFullDto, emoji: string): EventFeedPostFullDto {
  const isHeart = emoji === HEART_REACTION;
  // O backend regista corações como gostos, por isso `likedByMe` é a fonte de verdade para eles.
  const wasActive = isHeart ? post.likedByMe : post.myReactions.includes(emoji);

  const updated: EventFeedPostFullDto = {
    ...post,
    myReactions: toggleInSet(post.myReactions, emoji, !wasActive),
    reactionCounts: { ...post.reactionCounts, [emoji]: step(post.reactionCounts[emoji] ?? 0, !wasActive) },
  };
  if (!isHeart) return updated;

  const cancelsDownvote = !wasActive && post.downvotedByMe;
  return {
    ...updated,
    likedByMe: !wasActive,
    likeCount: step(post.likeCount, !wasActive),
    downvotedByMe: post.downvotedByMe && !cancelsDownvote,
    downvoteCount: cancelsDownvote ? step(post.downvoteCount, false) : post.downvoteCount,
  };
}

/** A resposta do servidor a um gosto prevalece sobre o palpite otimista. */
export function applyServerLike(post: EventFeedPostFullDto, liked: boolean): EventFeedPostFullDto {
  return { ...post, likedByMe: liked, myReactions: toggleInSet(post.myReactions, HEART_REACTION, liked) };
}

/** A publicação depois de o utilizador alternar o seu não-gosto; um não-gosto anula um gosto. */
export function applyDownvote(post: EventFeedPostFullDto): EventFeedPostFullDto {
  const wasDownvoted = post.downvotedByMe;
  const cancelsLike = !wasDownvoted && post.likedByMe;
  return {
    ...post,
    downvotedByMe: !wasDownvoted,
    downvoteCount: step(post.downvoteCount, !wasDownvoted),
    likedByMe: post.likedByMe && !cancelsLike,
    likeCount: cancelsLike ? step(post.likeCount, false) : post.likeCount,
  };
}

/** A resposta do servidor a um não-gosto prevalece sobre o palpite otimista. */
export function applyServerDownvote(post: EventFeedPostFullDto, downvoted: boolean): EventFeedPostFullDto {
  // Só uma mudança de estado mexe na contagem; o passo otimista pode já a ter feito.
  const isChange = downvoted !== post.downvotedByMe;
  return {
    ...post,
    downvotedByMe: downvoted,
    downvoteCount: isChange ? step(post.downvoteCount, downvoted) : post.downvoteCount,
  };
}

/** Votar na mesma opção outra vez retira o voto; votar noutra move-o. */
export function applyPollVote(post: EventFeedPostFullDto, optionId: string): EventFeedPostFullDto {
  const poll = post.poll;
  if (!poll) return post;

  const previousOptionId = poll.myOptionId ?? null;
  const isRemoving = previousOptionId === optionId;

  const options = poll.options.map((option) => {
    if (option.id === optionId) return { ...option, voteCount: step(option.voteCount, !isRemoving) };
    if (option.id === previousOptionId) return { ...option, voteCount: step(option.voteCount, false) };
    return option;
  });

  let totalVotes = poll.totalVotes;
  if (isRemoving) totalVotes = Math.max(0, totalVotes - 1);
  else if (!previousOptionId) totalVotes += 1;

  return { ...post, poll: { ...poll, myOptionId: isRemoving ? null : optionId, options, totalVotes } };
}

/** O comentário depois de o utilizador alternar uma reação com emoji. */
export function applyCommentReaction(comment: HubCommentDto, emoji: string): HubCommentDto {
  const wasActive = comment.myReactions.includes(emoji);
  return {
    ...comment,
    myReactions: toggleInSet(comment.myReactions, emoji, !wasActive),
    reactionCounts: { ...comment.reactionCounts, [emoji]: step(comment.reactionCounts[emoji] ?? 0, !wasActive) },
  };
}

/** A publicação com mais um ou menos um comentário, nunca abaixo de zero. */
export function changeCommentCount(post: EventFeedPostFullDto, delta: 1 | -1): EventFeedPostFullDto {
  return { ...post, commentCount: step(post.commentCount, delta === 1) };
}
