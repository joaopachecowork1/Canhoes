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

function usePostsInfiniteQuery(eventId: string | null, initialData?: FeedInfiniteData) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
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

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.hubPosts(eventId) });
  }, [queryClient, eventId]);

  useEffect(() => {
    const handlePostCreated = () => void refresh();
    window.addEventListener("hub:postCreated", handlePostCreated);
    return () => window.removeEventListener("hub:postCreated", handlePostCreated);
  }, [refresh]);

  return { query, refresh };
}

/** O feed do evento como query infinita (15 publicações por página), iniciada com a primeira página do servidor. */
export function useHubFeed(eventId: string | null, initialData?: FeedInfiniteData) {
  const queryClient = useQueryClient();
  const { query, refresh } = usePostsInfiniteQuery(eventId, initialData);

  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.posts) ?? [], [query.data]);
  const comments = useHubFeedComments({ eventId, queryClient });
  const postActions = useHubFeedPostActions({ eventId, queryClient });

  const hasMore = query.hasNextPage ?? false;
  const isFetchingNextPage = query.isFetchingNextPage;

  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingNextPage) void query.fetchNextPage();
  }, [hasMore, isFetchingNextPage, query]);

  return {
    posts,
    remainingPostsCount: countRemainingPosts(query.data),
    errorMessage: query.error ? getErrorMessage(query.error, messages.feed.useHubFeed.loadError) : null,
    loading: query.isLoading,
    hasMore,
    loadMore,
    isFetchingNextPage,
    refresh,
    ...comments,
    ...postActions,
  };
}
