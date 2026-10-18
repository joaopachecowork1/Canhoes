import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { paged } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesWishlistModule } from "./CanhoesWishlistModule";


const member = (id: string, displayName: string): PublicUserDto => ({ id, displayName, email: `${id}@canhoes.pt`, isAdmin: false });
const item = (id: string, userId: string, title: string): EventWishlistItemDto => ({
  id,
  userId,
  title,
  eventId: "event-1",
  url: null,
  notes: null,
  imageUrl: null,
  updatedAtUtc: "2026-10-01T10:00:00.000Z",
});

function renderWishlist() {
  return renderWithProviders(
    <CanhoesWishlistModule
      initialContext={makeEventContext({ modules: { wishlist: true } })}
      initialMembers={[member("rui", "Rui"), member("ana", "Ana")]}
      initialWishlistItems={[item("i1", "ana", "Livro"), item("i2", "rui", "Bola")]}
    />
  );
}

describe("CanhoesWishlistModule", () => {
  it("opens on your own list, where you can delete items", () => {
    renderWishlist();
    expect(screen.getByText("Livro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apagar item" })).toBeInTheDocument();
  });

  it("shows another member's list read-only", async () => {
    renderWishlist();
    await userEvent.click(screen.getByRole("button", { name: /Rui/ }));
    expect(screen.getByText("Bola")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apagar item" })).not.toBeInTheDocument();
  });

  it("needs a title of two letters before adding", async () => {
    renderWishlist();
    const submit = screen.getByRole("button", { name: "Adicionar item" });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Título"), "Té");
    expect(submit).toBeEnabled();
  });

  it("adds an item and refreshes the list", async () => {
    const recorder = recordRequests();
    server.use(
      http.post("*/api/v1/events/event-1/wishlist", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(item("i3", "ana", "Caneca"), { status: 201 });
      }),
      apiRoute("get", "events/event-1/wishlist", paged([item("i1", "ana", "Livro"), item("i3", "ana", "Caneca")]))
    );
    renderWishlist();

    await userEvent.type(screen.getByLabelText("Título"), " Caneca ");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar item" }));

    expect(await screen.findByText("Item adicionado")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ title: "Caneca", url: null, notes: null });
    expect(await screen.findByText("Caneca")).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("");
  });

  it("warns when the item cannot be saved", async () => {
    server.use(apiRoute("post", "events/event-1/wishlist", { message: "Título repetido." }, 409));
    renderWishlist();

    await userEvent.type(screen.getByLabelText("Título"), "Caneca");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar item" }));

    expect(await screen.findByText(/Título repetido/)).toBeInTheDocument();
  });

  it("removes your own item after confirming", async () => {
    server.use(apiRoute("delete", "events/event-1/wishlist/i1", null, 204));
    renderWishlist();

    await userEvent.click(screen.getByRole("button", { name: "Apagar item" }));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Item removido")).toBeInTheDocument();
    expect(screen.queryByText("Livro")).not.toBeInTheDocument();
  });
});
