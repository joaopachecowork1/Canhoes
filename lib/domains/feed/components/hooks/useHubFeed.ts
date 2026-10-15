import { useCallback, useEffect, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";

import { countRemainingPosts, toFeedPage, type FeedInfiniteData } from "./feedInfiniteData";
import { useHubFeedComments } from "./useHubFeedComments";
import { useHubFeedPostActions } from "./useHubFeedPostActions";

const PAGE_SIZE = 15;

export function useHubFeed(eventId: string | null, _currentUserId: string | null, initialData?: FeedInfiniteData) {
  const queryClient = useQueryClient();

  const postsInfiniteQuery = useInfiniteQuery({
    queryKey: ["hub-posts", eventId],
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
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? 15_000 : false,
  });

  const posts = useMemo(
    () => postsInfiniteQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [postsInfiniteQuery.data]
  );

  const { openComments, commentDrafts, replyingTo, toggleComments, addComment, deleteComment, toggleCommentReaction, setCommentDraft, setReplyingTo } =
    useHubFeedComments({ eventId, queryClient });

  const {
    showParticles,
    setShowParticles,
    toggleReaction,
    toggleDownvote,
    votePoll,
    adminPin,
    adminMovePinned,
    adminDelete,
  } = useHubFeedPostActions({ eventId, queryClient });

  const hasMorePosts = postsInfiniteQuery.hasNextPage ?? false;
  const isFetchingNextPage = postsInfiniteQuery.isFetchingNextPage;

  const loadMorePosts = useCallback(() => {
    if (hasMorePosts && !isFetchingNextPage) {
      void postsInfiniteQuery.fetchNextPage();
    }
  }, [hasMorePosts, isFetchingNextPage, postsInfiniteQuery]);

  const refreshPosts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["hub-posts", eventId] });
  }, [queryClient, eventId]);

  useEffect(() => {
    const handlePostCreated = () => void refreshPosts();
    window.addEventListener("hub:postCreated", handlePostCreated);
    return () => window.removeEventListener("hub:postCreated", handlePostCreated);
  }, [refreshPosts]);

  return {
    posts,
    remainingPostsCount: countRemainingPosts(postsInfiniteQuery.data),
    errorMessage: postsInfiniteQuery.error ? getErrorMessage(postsInfiniteQuery.error, "Erro ao carregar o feed.") : null,
    loading: postsInfiniteQuery.isLoading,
    hasMore: hasMorePosts,
    loadMore: loadMorePosts,
    isFetchingNextPage,
    openComments,
    commentDrafts,
    replyingTo,
    showParticles,
    setShowParticles,
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
