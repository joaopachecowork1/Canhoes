import type { InfiniteData } from "@tanstack/react-query";

import type { EventFeedPostFullDto, PagedResult } from "@/lib/api/types";

export type FeedPageData = {
  posts: EventFeedPostFullDto[];
  nextCursor: number | null;
  /** Posts on the server when this page was fetched. */
  total: number;
};

export type FeedInfiniteData = InfiniteData<FeedPageData, number>;

export function toFeedPage(result: PagedResult<EventFeedPostFullDto>): FeedPageData {
  return {
    posts: (Array.isArray(result.items) ? result.items : []).filter(
      (post): post is EventFeedPostFullDto => Boolean(post?.id)
    ),
    nextCursor: result.hasMore ? result.skip + result.take : null,
    total: result.total,
  };
}

/** Posts on the server that are not loaded yet; the last page has the freshest total. */
export function countRemainingPosts(feed: InfiniteData<FeedPageData> | undefined): number {
  if (!feed || feed.pages.length === 0) return 0;

  const loadedCount = feed.pages.reduce((count, page) => count + page.posts.length, 0);
  const total = feed.pages[feed.pages.length - 1].total;
  return Math.max(total - loadedCount, 0);
}

export function removePostFromFeed<TFeed extends InfiniteData<FeedPageData>>(
  feed: TFeed | undefined,
  postId: string
): TFeed | undefined {
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
