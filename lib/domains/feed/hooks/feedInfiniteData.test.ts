import { describe, expect, it } from "vitest";

import {
  countRemainingPosts,
  removePostFromFeed,
  sortPinnedPosts,
  toFeedPage,
  updatePostInFeed,
  type FeedInfiniteData,
} from "./feedInfiniteData";
import { makePost } from "./feedTestFixtures";

function makeFeed(pagePostIds: string[][], total: number): FeedInfiniteData {
  return {
    pages: pagePostIds.map((ids) => ({ posts: ids.map(makePost), nextCursor: null, total })),
    pageParams: pagePostIds.map((_, index) => index * 2),
  };
}

describe("toFeedPage", () => {
  it("keeps the API total and points the cursor at the next page", () => {
    const page = toFeedPage({ items: [makePost("a"), makePost("b")], total: 5, skip: 0, take: 2, hasMore: true });

    expect(page).toEqual({ posts: [makePost("a"), makePost("b")], nextCursor: 2, total: 5 });
  });

  it("ends the feed when there are no more posts", () => {
    expect(toFeedPage({ items: [makePost("e")], total: 5, skip: 4, take: 2, hasMore: false }).nextCursor).toBeNull();
  });
});

describe("countRemainingPosts", () => {
  it("counts the posts not loaded yet", () => {
    expect(countRemainingPosts(makeFeed([["a", "b"], ["c", "d"]], 7))).toBe(3);
  });

  it("is zero without data", () => {
    expect(countRemainingPosts(undefined)).toBe(0);
  });
});

describe("removePostFromFeed", () => {
  it("removes the post and decrements the total without changing the remaining count", () => {
    const feed = makeFeed([["a", "b"], ["c", "d"]], 7);
    const updatedFeed = removePostFromFeed(feed, "c");

    expect(updatedFeed?.pages.flatMap((page) => page.posts.map((post) => post.id))).toEqual(["a", "b", "d"]);
    expect(updatedFeed?.pages.map((page) => page.total)).toEqual([6, 6]);
    expect(countRemainingPosts(updatedFeed)).toBe(3);
  });

  it("leaves the feed untouched when the post is not loaded", () => {
    const feed = makeFeed([["a"]], 3);

    expect(removePostFromFeed(feed, "z")).toBe(feed);
  });
});

describe("updatePostInFeed", () => {
  it("changes only the matching post", () => {
    const feed = makeFeed([["a", "b"]], 2);
    const updated = updatePostInFeed(feed, "b", (post) => ({ ...post, text: "novo" }));
    expect(updated?.pages[0].posts.map((post) => post.text)).toEqual(["", "novo"]);
    expect(updated?.pages[0].posts[0]).toBe(feed.pages[0].posts[0]);
  });
});

describe("sortPinnedPosts", () => {
  it("puts pinned posts first, in pin order", () => {
    const feed = makeFeed([["a", "b", "c"]], 3);
    const [a, b, c] = feed.pages[0].posts;
    feed.pages[0].posts = [a, { ...b, isPinned: true, pinnedOrder: 2 }, { ...c, isPinned: true, pinnedOrder: 1 }];
    expect(sortPinnedPosts(feed)?.pages[0].posts.map((post) => post.id)).toEqual(["c", "b", "a"]);
  });
});
