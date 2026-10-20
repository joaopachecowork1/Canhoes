import { describe, expect, it, vi } from "vitest";
import { act, renderHook, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { apiRoute, recordRequests } from "@/tests/component/api";
import { post } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { usePublishPost, type PostDraft } from "./usePublishPost";

const EVENT = "events/event-1/feed";
const draft = (changes: Partial<PostDraft> = {}): PostDraft => ({
  text: "  Olá  ",
  files: [],
  poll: { isEnabled: false, question: "", options: [] },
  ...changes,
});
const png = new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" });

function setup(eventId: string | null = "event-1") {
  renderWithProviders(<div />); // the toaster that shows the messages
  return renderHook(() => usePublishPost(eventId));
}

describe("usePublishPost", () => {
  it("publishes the trimmed text and announces the new post to the feed", async () => {
    const recorder = recordRequests();
    server.use(
      http.post(`*/api/v1/${EVENT}/posts`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(post({ id: "p9" }), { status: 201 });
      }),
    );
    const onCreated = vi.fn();
    globalThis.addEventListener("hub:postCreated", onCreated);
    const { result } = setup();

    let published = false;
    await act(async () => {
      published = await result.current.publish(draft());
    });

    globalThis.removeEventListener("hub:postCreated", onCreated);
    expect(published).toBe(true);
    expect(recorder.requests[0]?.body).toMatchObject({ text: "Olá", mediaUrls: [], pollQuestion: null });
    expect(onCreated).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("idle");
  });

  it("uploads the images first and sends the poll with its filled options", async () => {
    const recorder = recordRequests();
    server.use(
      apiRoute("post", `${EVENT}/uploads`, { files: [{ url: "/uploads/feed/a.png" }] }),
      http.post(`*/api/v1/${EVENT}/posts`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(post(), { status: 201 });
      }),
    );
    const { result } = setup();

    await act(async () => {
      await result.current.publish(
        draft({ files: [png], poll: { isEnabled: true, question: " Onde? ", options: ["Porto", " ", "Braga"] } }),
      );
    });

    expect(recorder.requests[0]?.body).toMatchObject({
      mediaUrls: ["/uploads/feed/a.png"],
      pollQuestion: "Onde?",
      pollOptions: ["Porto", "Braga"],
    });
  });

  it("refuses an empty text, an unfinished poll and a missing event without calling the API", async () => {
    const withEvent = setup();
    const withoutEvent = setup(null);

    await act(async () => {
      expect(await withEvent.result.current.publish(draft({ text: "   " }))).toBe(false);
      expect(
        await withEvent.result.current.publish(draft({ poll: { isEnabled: true, question: "Só?", options: ["Uma"] } })),
      ).toBe(false);
      expect(await withoutEvent.result.current.publish(draft())).toBe(false);
    });

    expect((await screen.findAllByText(/sondagem|evento/i)).length).toBeGreaterThan(0);
  });

  it("says so when the server did not store every image, or refuses the post", async () => {
    server.use(apiRoute("post", `${EVENT}/uploads`, { files: [] }));
    const { result } = setup();

    await act(async () => {
      expect(await result.current.publish(draft({ files: [png] }))).toBe(false);
    });
    expect(result.current.status).toBe("idle");

    server.use(
      apiRoute("post", `${EVENT}/uploads`, { files: [{ url: "/uploads/feed/a.png" }] }),
      apiRoute("post", `${EVENT}/posts`, { message: "grande" }, 413),
    );
    await act(async () => {
      expect(await result.current.publish(draft({ files: [png] }))).toBe(false);
    });
    expect((await screen.findAllByText(/Não foi possível|demasiado|grande/i)).length).toBeGreaterThan(0);
  });
});
