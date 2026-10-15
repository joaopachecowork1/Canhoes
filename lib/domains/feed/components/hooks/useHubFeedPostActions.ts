import { useCallback, useEffect, useState } from "react";
import { type QueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EventFeedPostFullDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";
import { HEART_REACTION } from "@/lib/reactions";

import { removePostFromFeed, type FeedInfiniteData } from "./feedInfiniteData";

export type HubFeedParticlesState = {
  postId: string;
  x: number;
  y: number;
} | null;

type UseHubFeedPostActionsArgs = {
  eventId: string | null;
  queryClient: QueryClient;
};

function updateInfiniteFeedPosts(
  old: FeedInfiniteData | undefined,
  updater: (post: EventFeedPostFullDto) => EventFeedPostFullDto
): FeedInfiniteData | undefined {
  if (!old) return old;

  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      posts: page.posts.map(updater),
    })),
  };
}

function findPostInFeed(old: FeedInfiniteData | undefined, postId: string) {
  return old?.pages.flatMap((page) => page.posts).find((post) => post.id === postId);
}

function applyPostReaction(post: EventFeedPostFullDto, emoji: string) {
  const myReactions = new Set(post.myReactions ?? []);

  // For HEART_REACTION, use likedByMe as source of truth (backend tracks it separately)
  const wasActive = emoji === HEART_REACTION
    ? (post.likedByMe ?? false)
    : myReactions.has(emoji);

  if (wasActive) myReactions.delete(emoji);
  else myReactions.add(emoji);

  const reactionCounts = { ...post.reactionCounts };
  reactionCounts[emoji] = Math.max(
    0,
    (reactionCounts[emoji] ?? 0) + (wasActive ? -1 : 1)
  );

  let nextLikeCount = post.likeCount ?? 0;
  let nextDownvoteCount = post.downvoteCount ?? 0;
  let nextDownvotedByMe = post.downvotedByMe ?? false;

  if (emoji === HEART_REACTION) {
    nextLikeCount = Math.max(0, nextLikeCount + (wasActive ? -1 : 1));
    // Upvoting cancels an active downvote
    if (!wasActive && nextDownvotedByMe) {
      nextDownvotedByMe = false;
      nextDownvoteCount = Math.max(0, nextDownvoteCount - 1);
    }
  }

  return {
    ...post,
    likeCount: nextLikeCount,
    likedByMe: emoji === HEART_REACTION ? !wasActive : post.likedByMe,
    downvotedByMe: nextDownvotedByMe,
    downvoteCount: nextDownvoteCount,
    myReactions: Array.from(myReactions),
    reactionCounts,
  };
}

function applyPollVote(post: EventFeedPostFullDto, optionId: string) {
  if (!post.poll) return post;

  const currentPoll = post.poll;
  const previousOptionId = currentPoll.myOptionId ?? null;
  if (previousOptionId === optionId) {
    return {
      ...post,
      poll: {
        ...currentPoll,
        myOptionId: null,
        totalVotes: Math.max(0, currentPoll.totalVotes - 1),
        options: currentPoll.options.map((option) =>
          option.id === optionId
            ? { ...option, voteCount: Math.max(0, option.voteCount - 1) }
            : option
        ),
      },
    };
  }

  const options = currentPoll.options.map((option) => {
    if (option.id === optionId) {
      return { ...option, voteCount: option.voteCount + 1 };
    }

    if (previousOptionId && option.id === previousOptionId) {
      return { ...option, voteCount: Math.max(0, option.voteCount - 1) };
    }

    return option;
  });

  return {
    ...post,
    poll: {
      ...currentPoll,
      myOptionId: optionId,
      options,
      totalVotes: previousOptionId
        ? currentPoll.totalVotes
        : currentPoll.totalVotes + 1,
    },
  };
}

function sortPinnedPosts(old: FeedInfiniteData | undefined) {
  if (!old) return old;

  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      posts: [...page.posts].sort((left, right) =>
        Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned)) ||
        (left.pinnedOrder ?? Number.MAX_SAFE_INTEGER) - (right.pinnedOrder ?? Number.MAX_SAFE_INTEGER) ||
        String(right.createdAtUtc).localeCompare(String(left.createdAtUtc))
      ),
    })),
  };
}

export function useHubFeedPostActions({
  eventId,
  queryClient,
}: Readonly<UseHubFeedPostActionsArgs>) {
  const [showParticles, setShowParticles] = useState<HubFeedParticlesState>(null);

  useEffect(() => {
    setShowParticles(null);
  }, [eventId]);

  const toggleReactionMutation = useMutation({
    mutationFn: async ({ postId, emoji }: { postId: string; emoji: string }) => {
      if (!eventId) throw new Error("Missing eventId");
      if (emoji === HEART_REACTION) return feedRepo.togglePostLike(eventId, postId);
      return feedRepo.togglePostReaction(eventId, postId, emoji);
    },
  });

  const toggleReaction = useCallback(
    async (postId: string, emoji: string) => {
      if (!eventId) return;

      let previousPost: EventFeedPostFullDto | undefined;
      let appliedOptimisticUpdate = false;
      queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) => {
        previousPost = findPostInFeed(old, postId);
        appliedOptimisticUpdate = Boolean(previousPost);
        return updateInfiniteFeedPosts(old, (post) =>
          post.id === postId ? applyPostReaction(post, emoji) : post
        );
      });

      try {
        const result = (await toggleReactionMutation.mutateAsync({
          postId,
          emoji,
        })) as { liked?: boolean } | undefined;

        if (result && typeof result.liked === "boolean") {
          const liked = result.liked;
          queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) =>
            updateInfiniteFeedPosts(old, (post): EventFeedPostFullDto => {
              if (post.id !== postId) return post;
              const myReactions = new Set(post.myReactions ?? []);
              if (liked) myReactions.add(HEART_REACTION);
              else myReactions.delete(HEART_REACTION);
              return {
                ...post,
                likedByMe: liked,
                myReactions: Array.from(myReactions),
              };
            })
          );
        }
        toast.success("Reação atualizada");
      } catch (error) {
        if (appliedOptimisticUpdate && previousPost) {
          queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) =>
            updateInfiniteFeedPosts(old, (post) =>
              post.id === previousPost!.id ? previousPost! : post
            )
          );
        }
        const message = getErrorMessage(error, "Não foi possível atualizar a reação do post.");
        logFrontendError("HubFeed.toggleReaction", error, { emoji, postId });
        toast.error(message);
      }
    },
    [queryClient, toggleReactionMutation, eventId]
  );

  const toggleDownvote = useCallback(
    async (postId: string) => {
      if (!eventId) return;

      let previousPost: EventFeedPostFullDto | undefined;
      queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) => {
        previousPost = findPostInFeed(old, postId);
        return updateInfiniteFeedPosts(old, (post) => {
          if (post.id !== postId) return post;
          const wasDownvoted = post.downvotedByMe ?? false;
          let nextLikeCount = post.likeCount ?? 0;
          let nextLikedByMe = post.likedByMe ?? false;
          // Downvoting cancels an active upvote
          if (!wasDownvoted && nextLikedByMe) {
            nextLikedByMe = false;
            nextLikeCount = Math.max(0, nextLikeCount - 1);
          }
          return {
            ...post,
            downvotedByMe: !wasDownvoted,
            downvoteCount: Math.max(0, (post.downvoteCount ?? 0) + (wasDownvoted ? -1 : 1)),
            likedByMe: nextLikedByMe,
            likeCount: nextLikeCount,
          };
        });
      });

      try {
        const result = (await feedRepo.togglePostDownvote(eventId, postId)) as
          | { downvoted?: boolean }
          | undefined;

        if (result && typeof result.downvoted === "boolean") {
          const downvoted = result.downvoted;
          queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) =>
            updateInfiniteFeedPosts(old, (post): EventFeedPostFullDto => {
              if (post.id !== postId) return post;
              return {
                ...post,
                downvotedByMe: downvoted,
                downvoteCount: downvoted
                  ? (post.downvoteCount ?? 0) + (post.downvotedByMe ? 0 : 1)
                  : Math.max(0, (post.downvoteCount ?? 0) - (post.downvotedByMe ? 1 : 0)),
              };
            })
          );
        }
      } catch (error) {
        if (previousPost) {
          queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) =>
            updateInfiniteFeedPosts(old, (post) =>
              post.id === previousPost!.id ? previousPost! : post
            )
          );
        }
        const message = getErrorMessage(error, "Não foi possível atualizar o downvote do post.");
        logFrontendError("HubFeed.toggleDownvote", error, { postId });
        toast.error(message);
      }
    },
    [queryClient, eventId]
  );

  const votePoll = useCallback(
    async (postId: string, optionId: string) => {
      if (!eventId) return;

      setShowParticles({ postId, x: 50, y: 50 });

      const previousFeed = queryClient.getQueryData<FeedInfiniteData>(["hub-posts", eventId]);
      const previousPost = findPostInFeed(previousFeed, postId);

      queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) =>
        updateInfiniteFeedPosts(old, (post) =>
          post.id === postId ? applyPollVote(post, optionId) : post
        )
      );

      try {
        await feedRepo.votePoll(eventId, postId, optionId);
      } catch (error) {
        if (previousPost) {
          queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) =>
            updateInfiniteFeedPosts(old, (post) =>
              post.id === previousPost.id ? previousPost : post
            )
          );
        }
        const message = getErrorMessage(error, "Não foi possível registar o teu voto.");
        logFrontendError("HubFeed.votePoll", error, { optionId, postId });
        toast.error(message);
      }
    },
    [queryClient, eventId]
  );

  const adminPin = useCallback(async (postId: string) => {
    if (!eventId) return;

    try {
      const result = await feedRepo.adminPinPost(eventId, postId);
      queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) => {
        const updated = updateInfiniteFeedPosts(old, (post) =>
          post.id === postId
            ? { ...post, isPinned: result.pinned, pinnedOrder: result.pinnedOrder }
            : post
        );

        return sortPinnedPosts(updated);
      });
    } catch (error) {
      const message = getErrorMessage(error, "Não foi possível atualizar o destaque do post.");
      logFrontendError("HubFeed.adminPin", error, { postId });
      toast.error(message);
    }
  }, [queryClient, eventId]);

  const adminMovePinned = useCallback(async (postId: string, direction: "up" | "down") => {
    if (!eventId) return;

    try {
      await feedRepo.adminMovePinnedPost(eventId, postId, direction);
      await queryClient.invalidateQueries({ queryKey: ["hub-posts", eventId] });
    } catch (error) {
      const message = getErrorMessage(error, "Não foi possível reordenar o post fixado.");
      logFrontendError("HubFeed.adminMovePinned", error, { direction, postId });
      toast.error(message);
    }
  }, [queryClient, eventId]);

  const adminDelete = useCallback(async (postId: string) => {
    if (!eventId) return;

    await queryClient.cancelQueries({ queryKey: ["hub-posts", eventId] });
    const previousFeed = queryClient.getQueryData<FeedInfiniteData>(["hub-posts", eventId]);
    queryClient.setQueryData<FeedInfiniteData>(["hub-posts", eventId], (old) => removePostFromFeed(old, postId));

    try {
      await feedRepo.adminDeletePost(eventId, postId);
      toast.success("Post removido");
    } catch (error) {
      queryClient.setQueryData(["hub-posts", eventId], previousFeed);
      const message = getErrorMessage(error, "Não foi possível remover o post.");
      logFrontendError("HubFeed.adminDelete", error, { postId });
      toast.error(message);
    }
  }, [queryClient, eventId]);

  return {
    showParticles,
    setShowParticles,
    toggleReaction,
    toggleDownvote,
    votePoll,
    adminPin,
    adminMovePinned,
    adminDelete,
  };
}
