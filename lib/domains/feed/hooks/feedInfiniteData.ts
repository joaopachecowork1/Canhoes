import type { InfiniteData } from "@tanstack/react-query";

import type { EventFeedPostFullDto, PagedResult } from "@/lib/api/types";

export type FeedPageData = {
  posts: EventFeedPostFullDto[];
  nextCursor: number | null;
  /** Total de publicações no servidor quando esta página foi pedida. */
  total: number;
};

export type FeedInfiniteData = InfiniteData<FeedPageData, number>;

/** Converte uma página da API numa página do feed infinito, descartando publicações malformadas. */
export function toFeedPage(result: PagedResult<EventFeedPostFullDto>): FeedPageData {
  return {
    posts: (Array.isArray(result.items) ? result.items : []).filter((post): post is EventFeedPostFullDto =>
      Boolean(post?.id),
    ),
    nextCursor: result.hasMore ? result.skip + result.take : null,
    total: result.total,
  };
}

/** Publicações no servidor que ainda não foram carregadas; a última página tem o total mais recente. */
export function countRemainingPosts(feed: InfiniteData<FeedPageData> | undefined): number {
  if (!feed || feed.pages.length === 0) return 0;

  const loadedCount = feed.pages.reduce((count, page) => count + page.posts.length, 0);
  const total = feed.pages[feed.pages.length - 1].total;
  return Math.max(total - loadedCount, 0);
}

/** O feed sem a publicação dada, em todas as páginas carregadas. */
export function removePostFromFeed<TFeed extends InfiniteData<FeedPageData>>(
  feed: TFeed | undefined,
  postId: string,
): TFeed | undefined {
  // Se o post não está carregado devolve o mesmo objeto, para não provocar um novo render.
  const isPostLoaded = feed?.pages.some((page) => page.posts.some((post) => post.id === postId));
  if (!feed || !isPostLoaded) return feed;

  return {
    ...feed,
    pages: feed.pages.map((page) => ({
      ...page,
      posts: page.posts.filter((post) => post.id !== postId),
      total: Math.max(page.total - 1, 0),
    })),
  };
}

/** A publicação carregada com este id, se alguma página a tiver. */
export function findPostInFeed(feed: FeedInfiniteData | undefined, postId: string) {
  return feed?.pages.flatMap((page) => page.posts).find((post) => post.id === postId);
}

/** Substitui uma publicação onde estiver carregada; o resto do feed mantém a identidade dos objetos. */
export function updatePostInFeed(
  feed: FeedInfiniteData | undefined,
  postId: string,
  updater: (post: EventFeedPostFullDto) => EventFeedPostFullDto,
): FeedInfiniteData | undefined {
  if (!feed) return feed;

  return {
    ...feed,
    pages: feed.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.id === postId ? updater(post) : post)),
    })),
  };
}

const lastPinned = (post: EventFeedPostFullDto) => post.pinnedOrder ?? Number.MAX_SAFE_INTEGER;

/** Publicações fixadas primeiro, pela ordem de fixação, depois as mais recentes; cada página é ordenada por si. */
export function sortPinnedPosts(feed: FeedInfiniteData | undefined): FeedInfiniteData | undefined {
  if (!feed) return feed;

  return {
    ...feed,
    pages: feed.pages.map((page) => ({
      ...page,
      // Cópia antes de ordenar: nunca se muta a cache do React Query.
      posts: [...page.posts].sort(
        (left, right) =>
          Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned)) ||
          lastPinned(left) - lastPinned(right) ||
          String(right.createdAtUtc).localeCompare(String(left.createdAtUtc)),
      ),
    })),
  };
}
