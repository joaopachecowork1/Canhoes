import type { EventFeedPostFullDto, HubCommentDto } from "@/lib/api/types";
import { HEART_REACTION } from "@/lib/reactions";

/*
 * Optimistic changes to one post, applied to the cached feed before the server answers.
 * Up- and downvotes cancel each other, like the server does.
 */

const step = (count: number, isAdding: boolean) => Math.max(0, count + (isAdding ? 1 : -1));

function toggleInSet(values: readonly string[], value: string, isOn: boolean) {
  const next = new Set(values);
  if (isOn) next.add(value);
  else next.delete(value);
  return Array.from(next);
}

export function applyPostReaction(post: EventFeedPostFullDto, emoji: string): EventFeedPostFullDto {
  const isHeart = emoji === HEART_REACTION;
  // The backend tracks hearts as likes, so `likedByMe` is the source of truth for them.
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

/** The server's answer to a like wins over the optimistic guess. */
export function applyServerLike(post: EventFeedPostFullDto, liked: boolean): EventFeedPostFullDto {
  return { ...post, likedByMe: liked, myReactions: toggleInSet(post.myReactions, HEART_REACTION, liked) };
}

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

/** The server's answer to a downvote wins over the optimistic guess. */
export function applyServerDownvote(post: EventFeedPostFullDto, downvoted: boolean): EventFeedPostFullDto {
  // Only a change of state moves the count; the optimistic step may already have made it.
  const isChange = downvoted !== post.downvotedByMe;
  return {
    ...post,
    downvotedByMe: downvoted,
    downvoteCount: isChange ? step(post.downvoteCount, downvoted) : post.downvoteCount,
  };
}

/** Voting for the same option again removes the vote; another option moves it. */
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

export function applyCommentReaction(comment: HubCommentDto, emoji: string): HubCommentDto {
  const wasActive = comment.myReactions.includes(emoji);
  return {
    ...comment,
    myReactions: toggleInSet(comment.myReactions, emoji, !wasActive),
    reactionCounts: { ...comment.reactionCounts, [emoji]: step(comment.reactionCounts[emoji] ?? 0, !wasActive) },
  };
}

export function changeCommentCount(post: EventFeedPostFullDto, delta: 1 | -1): EventFeedPostFullDto {
  return { ...post, commentCount: step(post.commentCount, delta === 1) };
}
