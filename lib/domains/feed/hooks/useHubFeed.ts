import { useCallback, useEffect, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";

import { countRemainingPosts, toFeedPage, type FeedInfiniteData } from "./feedInfiniteData";
import { useHubFeedComments } from "./useHubFeedComments";
import { useHubFeedPostActions } from "./useHubFeedPostActions";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

const PAGE_SIZE = 15;

/** The event's feed as an infinite query (15 posts per page), seeded with the server's first page. */
export function useHubFeed(eventId: string | null, initialData?: FeedInfiniteData) {
  const queryClient = useQueryClient();

  const postsInfiniteQuery = useInfiniteQuery({
    queryKey: queryKeys.hubPosts(eventId),
    enabled: Boolean(eventId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      toFeedPage(await feedRepo.getPosts(eventId!, { skip: pageParam, take: PAGE_SIZE })),
    initialData,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 15_000 : false),
  });

  const posts = useMemo(
    () => postsInfiniteQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [postsInfiniteQuery.data],
  );

  const {
    openComments,
    commentDrafts,
    replyingTo,
    toggleComments,
    addComment,
    deleteComment,
    toggleCommentReaction,
    setCommentDraft,
    setReplyingTo,
  } = useHubFeedComments({ eventId, queryClient });

  const { toggleReaction, toggleDownvote, votePoll, adminPin, adminMovePinned, adminDelete } = useHubFeedPostActions({
    eventId,
    queryClient,
  });

  const hasMorePosts = postsInfiniteQuery.hasNextPage ?? false;
  const isFetchingNextPage = postsInfiniteQuery.isFetchingNextPage;

  const loadMorePosts = useCallback(() => {
    if (hasMorePosts && !isFetchingNextPage) {
      void postsInfiniteQuery.fetchNextPage();
    }
  }, [hasMorePosts, isFetchingNextPage, postsInfiniteQuery]);

  const refreshPosts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.hubPosts(eventId) });
  }, [queryClient, eventId]);

  useEffect(() => {
    const handlePostCreated = () => void refreshPosts();
    window.addEventListener("hub:postCreated", handlePostCreated);
    return () => window.removeEventListener("hub:postCreated", handlePostCreated);
  }, [refreshPosts]);

  return {
    posts,
    remainingPostsCount: countRemainingPosts(postsInfiniteQuery.data),
    errorMessage: postsInfiniteQuery.error
      ? getErrorMessage(postsInfiniteQuery.error, messages.feed.useHubFeed.loadError)
      : null,
    loading: postsInfiniteQuery.isLoading,
    hasMore: hasMorePosts,
    loadMore: loadMorePosts,
    isFetchingNextPage,
    openComments,
    commentDrafts,
    replyingTo,
    refresh: refreshPosts,
    toggleReaction,
    toggleDownvote,
    votePoll,
    toggleComments,
    addComment,
    deleteComment,
    toggleCommentReaction,
    adminPin,
    adminMovePinned,
    adminDelete,
    setCommentDraft,
    setReplyingTo,
  };
}
