import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";

import type { EventSecretSantaOverviewDto, EventWishlistItemDto } from "@/lib/api/types";
import { apiRoute } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { paged } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesSecretSantaModule } from "./CanhoesSecretSantaModule";

const overview = (overrides: Partial<EventSecretSantaOverviewDto> = {}): EventSecretSantaOverviewDto => ({
  eventId: "event-1",
  hasDraw: true,
  hasAssignment: true,
  assignedUser: { id: "rui", name: "Rui", role: "member" },
  myWishlistItemCount: 3,
  ...overrides,
});

const wish = (id: string, userId: string, title: string, url: string | null = null): EventWishlistItemDto => ({
  id,
  userId,
  title,
  eventId: "event-1",
  url,
  notes: null,
  imageUrl: null,
  updatedAtUtc: "2026-10-01T10:00:00.000Z",
});

function renderSecretSanta({
  secretSantaOverview = overview(),
  wishes = [wish("w1", "rui", "Meias", "https://loja.pt/meias"), wish("w2", "ana", "Livro")],
  isWishlistOpen = true,
}: { secretSantaOverview?: EventSecretSantaOverviewDto | null; wishes?: EventWishlistItemDto[]; isWishlistOpen?: boolean } = {}) {
  return renderWithProviders(
    <CanhoesSecretSantaModule
      initialContext={makeEventContext({ modules: { secretSanta: true, wishlist: isWishlistOpen } })}
      initialSecretSantaOverview={secretSantaOverview}
      initialWishlistData={paged(wishes)}
    />
  );
}

describe("CanhoesSecretSantaModule", () => {
  it("shows who you give to and only their wishlist", () => {
    renderSecretSanta();

    expect(screen.getByText("Sorteio feito")).toBeInTheDocument();
    expect(screen.getByText("Wishlist de Rui")).toBeInTheDocument();
    expect(screen.getByText("Meias")).toBeInTheDocument();
    expect(screen.queryByText("Livro")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver produto" })).toHaveAttribute("href", "https://loja.pt/meias");
  });

  it("asks the assigned person to fill their wishlist when it is empty", () => {
    renderSecretSanta({ wishes: [wish("w2", "ana", "Livro")] });
    expect(screen.getByText(/Ainda não há itens na wishlist/)).toBeInTheDocument();
  });

  it("says there is no draw yet", () => {
    renderSecretSanta({ secretSantaOverview: overview({ hasDraw: false, hasAssignment: false, assignedUser: null }) });

    expect(screen.getByText("Sorteio por fazer")).toBeInTheDocument();
    expect(screen.getByText("Ainda não existe sorteio para este evento.")).toBeInTheDocument();
    expect(screen.queryByText(/Wishlist de/)).not.toBeInTheDocument();
  });

  it("says when the draw left you without an assignment", () => {
    renderSecretSanta({ secretSantaOverview: overview({ hasAssignment: false, assignedUser: null }) });
    expect(screen.getByText(/ainda não há atribuição disponível/)).toBeInTheDocument();
  });

  it("links to the wishlist while it is open, else back to the event", () => {
    const { unmount } = renderSecretSanta();
    expect(screen.getAllByRole("link", { name: "Abrir wishlist" })[0]).toHaveAttribute("href", "/canhoes/wishlist");
    unmount();

    renderSecretSanta({ isWishlistOpen: false });
    expect(screen.getAllByRole("link", { name: "Voltar ao evento" })[0]).toHaveAttribute("href", "/canhoes");
  });

  it("shows your own wishlist count", () => {
    renderSecretSanta();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("offers a retry when the overview fails to load", async () => {
    server.use(apiRoute("get", "events/event-1/secret-santa/overview", { message: "boom" }, 500));
    renderSecretSanta({ secretSantaOverview: null });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Erro ao carregar o amigo secreto")).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
