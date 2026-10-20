import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { member, paged } from "@/tests/component/fixtures";
import { server } from "@/tests/component/server";
import { signInAs } from "@/tests/component/session";

import { useCanhoesWishlist } from "./useCanhoesWishlist";

const EVENT = "events/event-1";
const item = (id: string, userId = "ana") => ({ id, userId, userName: "Ana", title: `Item ${id}`, url: null, notes: null, imageUrl: null, createdAtUtc: "2026-10-01T10:00:00.000Z" });

function setup({ hasEvent = true } = {}) {
  signInAs({ id: "ana", name: "Ana" });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider isDevLoginAvailable={false}>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useCanhoesWishlist({ initialContext: hasEvent ? makeEventContext() : null }), { wrapper });
}

function serveWishlist(items = [item("i1")]) {
  server.use(
    apiRoute("get", `${EVENT}/members`, [member({ id: "ana", displayName: "Ana" }), member({ id: "rui", displayName: "Rui" })]),
    apiRoute("get", `${EVENT}/wishlist`, paged(items))
  );
}

describe("useCanhoesWishlist", () => {
  it("starts on your own list and lets you look at another member's", async () => {
    serveWishlist([item("i1"), item("i2", "rui")]);
    const { result } = setup();

    await waitFor(() => expect(result.current.selectedMember?.id).toBe("ana"));
    expect(result.current.selectedMemberItems.map((entry) => entry.id)).toEqual(["i1"]);

    act(() => result.current.setSelectedMemberId("rui"));
    expect(result.current.selectedMemberItems.map((entry) => entry.id)).toEqual(["i2"]);
  });

  it("says why the lists could not load", async () => {
    server.use(apiRoute("get", `${EVENT}/members`, { message: "base em baixo" }, 500), apiRoute("get", `${EVENT}/wishlist`, paged([])));
    const { result } = setup();

    await waitFor(() => expect(result.current.errorMessage).toContain("base em baixo"));
  });

  it("does not save a title that is too short", async () => {
    serveWishlist();
    const recorder = recordRequests();
    server.use(http.post(`*/api/v1/${EVENT}/wishlist`, async ({ request }) => { await recorder.capture(request); return HttpResponse.json(item("new")); }));
    const { result } = setup();
    await waitFor(() => expect(result.current.members).toHaveLength(2));

    act(() => result.current.setFormState({ title: "a", url: "", notes: "", selectedFile: null }));
    await act(() => result.current.createWishlistItem());

    expect(result.current.canSubmit).toBe(false);
    expect(recorder.requests).toEqual([]);
  });

  it("adds an item with its image, then clears the form", async () => {
    serveWishlist();
    const recorder = recordRequests();
    server.use(
      http.post(`*/api/v1/${EVENT}/wishlist`, async ({ request }) => { await recorder.capture(request); return HttpResponse.json(item("new")); }),
      apiRoute("post", `${EVENT}/wishlist/new/image`, {})
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.members).toHaveLength(2));
    const image = new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" });

    act(() => result.current.setFormState({ title: " Rato ", url: "", notes: " sem fios ", selectedFile: image }));
    await act(() => result.current.createWishlistItem());

    expect(recorder.requests[0]?.body).toEqual({ title: "Rato", url: null, notes: "sem fios" });
    expect(result.current.formState).toMatchObject({ title: "", selectedFile: null });
    expect((await screen.findAllByText(/adicionado/i)).length).toBeGreaterThan(0);
  });

  it("keeps the item and says so when the delete fails", async () => {
    serveWishlist();
    server.use(http.delete(`*/api/v1/${EVENT}/wishlist/i1`, () => HttpResponse.json({ message: "não deu" }, { status: 500 })));
    const { result } = setup();
    await waitFor(() => expect(result.current.wishlistItems).toHaveLength(1));

    await act(() => result.current.deleteWishlistItem("i1"));

    expect(result.current.wishlistItems).toHaveLength(1);
    expect(result.current.deletingItemId).toBeNull();
    expect((await screen.findAllByText(/não deu/)).length).toBeGreaterThan(0);
  });

  it("does nothing without an event", async () => {
    const { result } = setup({ hasEvent: false });

    await act(async () => {
      await result.current.createWishlistItem();
      await result.current.deleteWishlistItem("i1");
      await result.current.retryLoading();
    });

    expect(result.current.eventId).toBeNull();
  });
});
