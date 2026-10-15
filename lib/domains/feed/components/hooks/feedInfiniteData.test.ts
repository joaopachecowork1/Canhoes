import { describe, expect, it } from "vitest";

import type { EventFeedPostFullDto } from "@/lib/api/types";

import { countRemainingPosts, removePostFromFeed, toFeedPage, type FeedInfiniteData } from "./feedInfiniteData";

function makePost(id: string): EventFeedPostFullDto {
  return {
    id,
    eventId: "event",
    authorUserId: "author",
    authorName: "Autor",
    text: "",
    mediaUrl: null,
    mediaUrls: [],
    isPinned: false,
    pinnedOrder: null,
    createdAtUtc: "2026-01-01T00:00:00.000Z",
    likeCount: 0,
    commentCount: 0,
    downvoteCount: 0,
    reactionCounts: {},
    myReactions: [],
    likedByMe: false,
    downvotedByMe: false,
    poll: null,
  };
}

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
