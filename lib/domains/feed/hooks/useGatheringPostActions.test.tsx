import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import type { EventGatheringDto } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { post } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import messages from "@/messages/pt.json";

import type { FeedInfiniteData } from "./feedInfiniteData";
import { useGatheringPostActions } from "./useGatheringPostActions";

const copy = messages.feed.useGatheringPostActions;
const GATHERING = "events/event-1/gatherings/g1";

const gathering = (overrides: Partial<EventGatheringDto> = {}): EventGatheringDto => ({
  id: "g1",
  eventId: "event-1",
  title: "Jantar",
  description: null,
  location: null,
  locationAddress: null,
  latitude: null,
  longitude: null,
  mapUrl: null,
  placeId: null,
  status: "POLLING",
  confirmedDate: null,
  postId: "post-1",
  createdAtUtc: "2026-10-01T10:00:00.000Z",
  dateOptions: [],
  rsvps: [],
  myRsvp: null,
  myRsvpNote: null,
  ...overrides,
});

function setup(eventId: string | null = "event-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const feed: FeedInfiniteData = {
    pages: [
      { posts: [post({ id: "post-1", gathering: gathering() }), post({ id: "post-2" })], nextCursor: null, total: 2 },
    ],
    pageParams: [0],
  };
  queryClient.setQueryData(queryKeys.hubPosts("event-1"), feed);
  renderWithProviders(<div />); // the toaster that shows the messages
  const hook = renderHook(() => useGatheringPostActions(queryClient, eventId));
  const shown = () =>
    queryClient.getQueryData<FeedInfiniteData>(queryKeys.hubPosts("event-1"))?.pages[0]?.posts[0]?.gathering;
  return { shown, ...hook };
}

describe("useGatheringPostActions", () => {
  it("shows the gathering as the server returns it after a vote on a date", async () => {
    server.use(apiRoute("post", `${GATHERING}/vote-date`, gathering({ title: "Jantar (atualizado)" })));
    const { result, shown } = setup();

    await act(async () => result.current.voteGatheringDate("post-1", "g1", "opt-1"));

    expect(shown()?.title).toBe("Jantar (atualizado)");
  });

  it("confirms the date, shows the confirmed gathering and says so", async () => {
    const recorder = recordRequests();
    server.use(
      http.post(`*/api/v1/${GATHERING}/confirm-date`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(gathering({ status: "CONFIRMED", confirmedDate: "Sábado 13" }));
      }),
    );
    const { result, shown } = setup();

    await act(async () => result.current.confirmGatheringDate("post-1", "g1", "Sábado 13"));

    expect(recorder.requests[0]?.body).toEqual({ dateText: "Sábado 13" });
    expect(shown()).toMatchObject({ status: "CONFIRMED", confirmedDate: "Sábado 13" });
    expect(await screen.findByText(copy.confirmSuccess)).toBeInTheDocument();
  });

  it("sends the answer with its note, shows it and says so", async () => {
    const recorder = recordRequests();
    server.use(
      http.post(`*/api/v1/${GATHERING}/rsvp`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(gathering({ myRsvp: "GOING", myRsvpNote: "levo vinho" }));
      }),
    );
    const { result, shown } = setup();

    await act(async () => result.current.submitGatheringRsvp("post-1", "g1", "GOING", "levo vinho"));

    expect(recorder.requests[0]?.body).toEqual({ status: "GOING", note: "levo vinho" });
    expect(shown()).toMatchObject({ myRsvp: "GOING", myRsvpNote: "levo vinho" });
    expect(await screen.findByText(copy.rsvpSuccess)).toBeInTheDocument();
  });

  it.each([
    [
      "vote",
      copy.voteError,
      (hook: ReturnType<typeof setup>["result"]) => hook.current.voteGatheringDate("post-1", "g1", "o"),
      "vote-date",
    ],
    [
      "confirm",
      copy.confirmError,
      (hook: ReturnType<typeof setup>["result"]) => hook.current.confirmGatheringDate("post-1", "g1", "x"),
      "confirm-date",
    ],
    [
      "rsvp",
      copy.rsvpError,
      (hook: ReturnType<typeof setup>["result"]) => hook.current.submitGatheringRsvp("post-1", "g1", "MAYBE"),
      "rsvp",
    ],
  ])("keeps the gathering and says so when the %s fails", async (_name, message, act1, path) => {
    server.use(http.post(`*/api/v1/${GATHERING}/${path}`, () => HttpResponse.error()));
    const { result, shown } = setup();

    await act(async () => act1(result));

    expect(shown()?.title).toBe("Jantar");
    expect(await screen.findByText(new RegExp(message.replace(".", "\\.")))).toBeInTheDocument();
  });

  it("does nothing without an event", async () => {
    const { result, shown } = setup(null);

    await act(async () => {
      await result.current.voteGatheringDate("post-1", "g1", "o");
      await result.current.confirmGatheringDate("post-1", "g1", "x");
      await result.current.submitGatheringRsvp("post-1", "g1", "GOING");
    });

    expect(shown()?.title).toBe("Jantar");
  });
});
