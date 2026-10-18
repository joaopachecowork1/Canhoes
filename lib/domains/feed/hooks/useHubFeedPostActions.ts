import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EventFeedPostFullDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";
import { HEART_REACTION } from "@/lib/reactions";
import messages from "@/messages/pt.json";

import {
  findPostInFeed,
  removePostFromFeed,
  sortPinnedPosts,
  updatePostInFeed,
  type FeedInfiniteData,
} from "./feedInfiniteData";
import { applyDownvote, applyPollVote, applyPostReaction, applyServerDownvote, applyServerLike } from "./feedPostUpdates";

const copy = messages.feed.useHubFeedPostActions;

type UseHubFeedPostActionsArgs = {
  eventId: string | null;
  queryClient: QueryClient;
};

type PostUpdater = (post: EventFeedPostFullDto) => EventFeedPostFullDto;

function reportFeedError(
  action: string,
  error: unknown,
  { context, fallback }: Readonly<{ context: Record<string, unknown>; fallback: string }>
) {
  logFrontendError(`HubFeed.${action}`, error, context);
  toast.error(getErrorMessage(error, fallback));
}

/** Reads and writes the cached feed of one event. */
function useFeedCache(queryClient: QueryClient, eventId: string | null) {
  return useCallback(
    (update: (feed: FeedInfiniteData | undefined) => FeedInfiniteData | undefined) => {
      if (!eventId) return undefined;
      const queryKey = ["hub-posts", eventId];
      const previous = queryClient.getQueryData<FeedInfiniteData>(queryKey);
      queryClient.setQueryData<FeedInfiniteData>(queryKey, update);
      return previous;
    },
    [queryClient, eventId]
  );
}

/**
 * Applies `optimistic` to the cached post, sends `request`, then lets the server answer win
 * (`fromServer`). On failure the post goes back to how it was and the error becomes a toast.
 */
function useOptimisticPostAction(queryClient: QueryClient, eventId: string | null) {
  const updateFeed = useFeedCache(queryClient, eventId);

  return useCallback(
    async <TResult>({
      action,
      context,
      fallbackError,
      fromServer,
      optimistic,
      postId,
      request,
    }: {
      action: string;
      context: Record<string, unknown>;
      fallbackError: string;
      fromServer?: (result: TResult) => PostUpdater;
      optimistic: PostUpdater;
      postId: string;
      request: (eventId: string) => Promise<TResult>;
    }) => {
      if (!eventId) return false;

      const previousPost = findPostInFeed(updateFeed((feed) => updatePostInFeed(feed, postId, optimistic)), postId);

      try {
        const result = await request(eventId);
        if (fromServer) updateFeed((feed) => updatePostInFeed(feed, postId, fromServer(result)));
        return true;
      } catch (error) {
        if (previousPost) updateFeed((feed) => updatePostInFeed(feed, postId, () => previousPost));
        reportFeedError(action, error, { context, fallback: fallbackError });
        return false;
      }
    },
    [eventId, updateFeed]
  );
}

function usePostVotes(queryClient: QueryClient, eventId: string | null) {
  const runOptimistic = useOptimisticPostAction(queryClient, eventId);

  const toggleReaction = useCallback(
    async (postId: string, emoji: string) => {
      const isHeart = emoji === HEART_REACTION;
      const isDone = await runOptimistic<{ liked: boolean } | null>({
        action: "toggleReaction",
        context: { emoji, postId },
        fallbackError: copy.reactionError,
        optimistic: (post) => applyPostReaction(post, emoji),
        postId,
        request: async (id) => {
          if (isHeart) return feedRepo.togglePostLike(id, postId);
          await feedRepo.togglePostReaction(id, postId, emoji);
          return null;
        },
        fromServer: (result) => (post) => (result ? applyServerLike(post, result.liked) : post),
      });
      if (isDone) toast.success(copy.reactionUpdated);
    },
    [runOptimistic]
  );

  const toggleDownvote = useCallback(
    async (postId: string) => {
      await runOptimistic({
        action: "toggleDownvote",
        context: { postId },
        fallbackError: copy.downvoteError,
        optimistic: applyDownvote,
        postId,
        request: (id) => feedRepo.togglePostDownvote(id, postId),
        fromServer: (result) => (post) => applyServerDownvote(post, result.downvoted),
      });
    },
    [runOptimistic]
  );

  return { toggleReaction, toggleDownvote, runOptimistic };
}

function useAdminPostActions(queryClient: QueryClient, eventId: string | null) {
  const updateFeed = useFeedCache(queryClient, eventId);

  const adminPin = useCallback(async (postId: string) => {
    if (!eventId) return;

    try {
      const { pinned, pinnedOrder } = await feedRepo.adminPinPost(eventId, postId);
      updateFeed((feed) =>
        sortPinnedPosts(updatePostInFeed(feed, postId, (post) => ({ ...post, isPinned: pinned, pinnedOrder })))
      );
    } catch (error) {
      reportFeedError("adminPin", error, { context: { postId }, fallback: copy.pinError });
    }
  }, [eventId, updateFeed]);

  const adminMovePinned = useCallback(async (postId: string, direction: "up" | "down") => {
    if (!eventId) return;

    try {
      await feedRepo.adminMovePinnedPost(eventId, postId, direction);
      await queryClient.invalidateQueries({ queryKey: ["hub-posts", eventId] });
    } catch (error) {
      reportFeedError("adminMovePinned", error, { context: { direction, postId }, fallback: copy.movePinnedError });
    }
  }, [queryClient, eventId]);

  const adminDelete = useCallback(async (postId: string) => {
    if (!eventId) return;

    await queryClient.cancelQueries({ queryKey: ["hub-posts", eventId] });
    const previousFeed = updateFeed((feed) => removePostFromFeed(feed, postId));

    try {
      await feedRepo.adminDeletePost(eventId, postId);
      toast.success(copy.postRemoved);
    } catch (error) {
      queryClient.setQueryData(["hub-posts", eventId], previousFeed);
      reportFeedError("adminDelete", error, { context: { postId }, fallback: copy.deleteError });
    }
  }, [queryClient, eventId, updateFeed]);

  return { adminPin, adminMovePinned, adminDelete };
}

/** Reactions, downvotes, poll votes, pins and deletes on feed posts, applied optimistically and rolled back on failure. */
export function useHubFeedPostActions({
  eventId,
  queryClient,
}: Readonly<UseHubFeedPostActionsArgs>) {
  const { toggleReaction, toggleDownvote, runOptimistic } = usePostVotes(queryClient, eventId);
  const { adminPin, adminMovePinned, adminDelete } = useAdminPostActions(queryClient, eventId);

  const votePoll = useCallback(
    async (postId: string, optionId: string) => {
      if (!eventId) return;

      await runOptimistic({
        action: "votePoll",
        context: { optionId, postId },
        fallbackError: copy.pollVoteError,
        optimistic: (post) => applyPollVote(post, optionId),
        postId,
        request: (id) => feedRepo.votePoll(id, postId, optionId),
      });
    },
    [eventId, runOptimistic]
  );

  return {
    toggleReaction,
    toggleDownvote,
    votePoll,
    adminPin,
    adminMovePinned,
    adminDelete,
  };
}
