import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import { makeEventContext } from "@/tests/component/eventContext";
import { renderWithProviders } from "@/tests/component/renderWithProviders";

import { CanhoesWishlistModule } from "./CanhoesWishlistModule";

vi.mock("@/components/providers/AuthContext", () => ({ useAuth: () => ({ user: { id: "ana" } }) }));
vi.mock("@/lib/repositories/eventRepo", () => ({ eventRepo: {} }));

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
});
