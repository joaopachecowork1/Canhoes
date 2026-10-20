import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import type { HubCommentDto } from "@/lib/api/types";
import { apiRoute } from "@/tests/component/api";
import { comment, post } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { queryKeys } from "@/lib/queryKeys";

import type { FeedInfiniteData } from "./feedInfiniteData";
import { useHubFeedComments } from "./useHubFeedComments";

const POST_PATH = "events/event-1/feed/posts/post-1";
const commentsKey = queryKeys.hubComments("post-1");

function setup(eventId: string | null = "event-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const feed: FeedInfiniteData = {
    pages: [{ posts: [post({ commentCount: 1 })], nextCursor: null, total: 1 }],
    pageParams: [0],
  };
  queryClient.setQueryData(["hub-posts", "event-1"], feed);
  queryClient.setQueryData<HubCommentDto[]>(commentsKey, [comment({ id: "c1" })]);
  renderWithProviders(<div />); // the toaster that shows the messages
  const hook = renderHook(({ id }) => useHubFeedComments({ eventId: id, queryClient }), {
    initialProps: { id: eventId },
  });
  return { queryClient, ...hook };
}

const cachedComments = (queryClient: QueryClient) => queryClient.getQueryData<HubCommentDto[]>(commentsKey) ?? [];
const cachedCount = (queryClient: QueryClient) =>
  queryClient.getQueryData<FeedInfiniteData>(["hub-posts", "event-1"])?.pages[0]?.posts[0]?.commentCount;

describe("useHubFeedComments: drafts", () => {
  it("keeps one open thread, draft and reply target per post, and starts over for another event", () => {
    const { result, rerender } = setup();

    act(() => {
      result.current.toggleComments("post-1");
      result.current.setCommentDraft("post-1", "Olá");
      result.current.setReplyingTo("post-1", "c1");
    });
    expect(result.current).toMatchObject({
      openComments: { "post-1": true },
      commentDrafts: { "post-1": "Olá" },
      replyingTo: { "post-1": "c1" },
    });

    act(() => result.current.toggleComments("post-1"));
    expect(result.current.openComments["post-1"]).toBe(false);

    rerender({ id: "event-2" });
    expect(result.current.commentDrafts).toEqual({});
  });
});

describe("useHubFeedComments: adding", () => {
  it("publishes a reply, adds it to the thread and counts it", async () => {
    server.use(apiRoute("post", `${POST_PATH}/comments`, comment({ id: "c2", text: "Concordo" }), 201));
    const { result, queryClient } = setup();
    act(() => {
      result.current.setCommentDraft("post-1", "  Concordo ");
      result.current.setReplyingTo("post-1", "c1");
    });
    await waitFor(() => expect(result.current.commentDrafts["post-1"]).toBe("  Concordo "));

    await act(() => result.current.addComment("post-1"));

    expect(cachedComments(queryClient).map((entry) => entry.id)).toEqual(["c1", "c2"]);
    expect(cachedCount(queryClient)).toBe(2);
    expect(result.current).toMatchObject({
      commentDrafts: { "post-1": "" },
      replyingTo: { "post-1": null },
      openComments: { "post-1": true },
    });
  });

  it("ignores a blank reply and does nothing without an event", async () => {
    const { result, queryClient } = setup(null);

    await act(() => result.current.addComment("post-1"));

    expect(cachedComments(queryClient)).toHaveLength(1);
  });

  it("keeps the draft and says so when the reply cannot be sent", async () => {
    server.use(apiRoute("post", `${POST_PATH}/comments`, { message: "fechado" }, 500));
    const { result, queryClient } = setup();
    act(() => result.current.setCommentDraft("post-1", "Olá"));
    await waitFor(() => expect(result.current.commentDrafts["post-1"]).toBe("Olá"));

    await act(() => result.current.addComment("post-1"));

    expect(result.current.commentDrafts["post-1"]).toBe("Olá");
    expect(cachedCount(queryClient)).toBe(1);
    expect((await screen.findAllByText(/fechado/)).length).toBeGreaterThan(0);
  });
});

describe("useHubFeedComments: reacting and deleting", () => {
  it("shows a reaction at once and reloads the thread when the server refuses it", async () => {
    server.use(
      apiRoute("post", `${POST_PATH}/comments/c1/reactions`, { message: "não" }, 500),
      apiRoute("get", `${POST_PATH}/comments`, [comment({ id: "c1" })]),
    );
    const { result, queryClient } = setup();

    await act(() => result.current.toggleCommentReaction("post-1", "c1", "heart"));

    expect((await screen.findAllByText(/não/)).length).toBeGreaterThan(0);
    expect(queryClient.getQueryState(commentsKey)?.isInvalidated).toBe(true);
  });

  it("removes a comment at once and puts it back when the delete fails", async () => {
    server.use(
      http.delete(`*/api/v1/${POST_PATH}/comments/c1`, () =>
        HttpResponse.json({ message: "sem permissão" }, { status: 500 }),
      ),
    );
    const { result, queryClient } = setup();

    await act(() => result.current.deleteComment("post-1", "c1"));

    expect(cachedComments(queryClient).map((entry) => entry.id)).toEqual(["c1"]);
    expect(cachedCount(queryClient)).toBe(1);
    expect((await screen.findAllByText(/sem permissão/)).length).toBeGreaterThan(0);
  });

  it("deletes for good when the server agrees, and ignores a comment that is not loaded", async () => {
    server.use(http.delete(`*/api/v1/${POST_PATH}/comments/c1`, () => new HttpResponse(null, { status: 204 })));
    const { result, queryClient } = setup();

    await act(() => result.current.deleteComment("post-1", "unknown"));
    expect(cachedComments(queryClient)).toHaveLength(1);

    await act(() => result.current.deleteComment("post-1", "c1"));
    expect(cachedComments(queryClient)).toEqual([]);
    expect(cachedCount(queryClient)).toBe(0);
  });
});
