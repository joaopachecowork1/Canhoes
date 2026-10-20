import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { apiRoute } from "@/tests/component/api";
import { post } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { HEART_REACTION } from "@/lib/reactions";
import { queryKeys } from "@/lib/queryKeys";

import type { FeedInfiniteData } from "./feedInfiniteData";
import { useHubFeedPostActions } from "./useHubFeedPostActions";

const P = "events/event-1/feed/posts/post-1";

function setup(eventId: string | null = "event-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const feed: FeedInfiniteData = {
    pages: [
      {
        posts: [post({ id: "post-1", likeCount: 1 }), post({ id: "post-2", text: "Outro" })],
        nextCursor: null,
        total: 2,
      },
    ],
    pageParams: [0],
  };
  queryClient.setQueryData(queryKeys.hubPosts("event-1"), feed);
  renderWithProviders(<div />); // the toaster that shows the messages
  const hook = renderHook(() => useHubFeedPostActions({ eventId, queryClient }));
  const cached = () => queryClient.getQueryData<FeedInfiniteData>(queryKeys.hubPosts("event-1"))?.pages[0]?.posts ?? [];
  return { queryClient, cached, ...hook };
}

describe("useHubFeedPostActions: reactions", () => {
  it("counts a like at once and keeps the server's answer", async () => {
    server.use(apiRoute("post", `${P}/like`, { liked: true }));
    const { result, cached } = setup();

    await act(() => result.current.toggleReaction("post-1", HEART_REACTION));

    expect(cached()[0]).toMatchObject({ likedByMe: true, likeCount: 2 });
    expect((await screen.findAllByText(/reação|atualizad/i)).length).toBeGreaterThan(0);
  });

  it("takes an emoji reaction back when the server refuses it", async () => {
    server.use(apiRoute("post", `${P}/reactions`, { message: "não" }, 500));
    const { result, cached } = setup();

    await act(() => result.current.toggleReaction("post-1", "😂"));

    expect(cached()[0]?.myReactions).toEqual([]);
    expect((await screen.findAllByText(/não/)).length).toBeGreaterThan(0);
  });

  it("applies a downvote, then rolls it back on failure", async () => {
    server.use(apiRoute("post", `${P}/downvote`, { downvoted: true }));
    const { result, cached } = setup();
    await act(() => result.current.toggleDownvote("post-1"));
    expect(cached()[0]).toMatchObject({ downvotedByMe: true, downvoteCount: 1 });

    server.use(apiRoute("post", `${P}/downvote`, { message: "falhou" }, 500));
    await act(() => result.current.toggleDownvote("post-1"));
    expect(cached()[0]).toMatchObject({ downvotedByMe: true, downvoteCount: 1 });
  });

  it("does nothing without an event", async () => {
    const { result, cached } = setup(null);

    await act(() => result.current.toggleDownvote("post-1"));
    await act(() => result.current.votePoll("post-1", "o1"));

    expect(cached()[0]).toMatchObject({ downvotedByMe: false });
  });
});

describe("useHubFeedPostActions: poll votes", () => {
  it("restores the poll when the vote is refused", async () => {
    server.use(apiRoute("post", `${P}/poll/vote`, { message: "fechada" }, 500));
    const { result, queryClient } = setup();
    const withPoll = post({
      id: "post-1",
      poll: {
        question: "Onde?",
        totalVotes: 0,
        myOptionId: null,
        options: [{ id: "o1", text: "Porto", voteCount: 0 }],
      },
    });
    queryClient.setQueryData<FeedInfiniteData>(queryKeys.hubPosts("event-1"), {
      pages: [{ posts: [withPoll], nextCursor: null, total: 1 }],
      pageParams: [0],
    });

    await act(() => result.current.votePoll("post-1", "o1"));

    const poll = queryClient.getQueryData<FeedInfiniteData>(queryKeys.hubPosts("event-1"))?.pages[0]?.posts[0]?.poll;
    expect(poll).toMatchObject({ myOptionId: null, totalVotes: 0 });
    expect((await screen.findAllByText(/fechada/)).length).toBeGreaterThan(0);
  });
});

describe("useHubFeedPostActions: admin", () => {
  it("pins a post and puts the pinned ones first", async () => {
    server.use(apiRoute("post", "events/event-1/feed/posts/post-2/pin", { pinned: true, pinnedOrder: 0 }));
    const { result, cached } = setup();

    await act(() => result.current.adminPin("post-2"));

    expect(cached().map((entry) => entry.id)).toEqual(["post-2", "post-1"]);
  });

  it("reports a failed pin or move without touching the list", async () => {
    server.use(
      apiRoute("post", `${P}/pin`, { message: "x" }, 500),
      apiRoute("patch", `${P}/pin`, { message: "y" }, 500),
    );
    const { result, cached } = setup();

    await act(() => result.current.adminPin("post-1"));
    await act(() => result.current.adminMovePinned("post-1", "up"));

    expect(cached().map((entry) => entry.id)).toEqual(["post-1", "post-2"]);
    expect((await screen.findAllByText(/[xy]/)).length).toBeGreaterThan(0);
  });

  it("moves a pinned post and reloads the feed", async () => {
    server.use(
      apiRoute("patch", `${P}/pin`, {}),
      apiRoute("get", "events/event-1/feed/posts", { items: [], total: 0, skip: 0, take: 15, hasMore: false }),
    );
    const { result, queryClient } = setup();

    await act(() => result.current.adminMovePinned("post-1", "down"));

    expect(queryClient.getQueryState(queryKeys.hubPosts("event-1"))?.isInvalidated).toBe(true);
  });

  it("removes a post at once, and brings it back when the delete fails", async () => {
    server.use(http.delete(`*/api/v1/${P}`, () => HttpResponse.json({ message: "sem permissão" }, { status: 500 })));
    const { result, cached } = setup();
    await act(() => result.current.adminDelete("post-1"));
    expect(cached().map((entry) => entry.id)).toEqual(["post-1", "post-2"]);

    server.use(http.delete(`*/api/v1/${P}`, () => new HttpResponse(null, { status: 204 })));
    await act(() => result.current.adminDelete("post-1"));
    expect(cached().map((entry) => entry.id)).toEqual(["post-2"]);
  });
});
