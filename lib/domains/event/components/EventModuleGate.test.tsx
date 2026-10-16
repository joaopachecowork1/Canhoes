import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { makeEventContext } from "@/tests/component/eventContext";

import { EventModuleGate } from "./EventModuleGate";

const overviewState = vi.hoisted(() => ({ current: null as ReturnType<typeof useEventOverview> | null }));
vi.mock("@/lib/domains/event/hooks/useEventOverview", () => ({ useEventOverview: () => overviewState.current }));

function setOverview({ isAdmin = false, isWishlistOpen = false } = {}) {
  const context = makeEventContext({ isAdmin, modules: { wishlist: isWishlistOpen } });
  overviewState.current = { error: null, event: context.event, isLoading: false, isFetching: false, overview: context.overview, refresh: vi.fn() };
}

describe("EventModuleGate", () => {
  beforeEach(() => setOverview());

  it("shows the page when the phase opens the area", () => {
    setOverview({ isWishlistOpen: true });
    render(<EventModuleGate moduleKey="wishlist">{"conteúdo da wishlist"}</EventModuleGate>);
    expect(screen.getByText("conteúdo da wishlist")).toBeInTheDocument();
  });

  it("locks a closed area for members", () => {
    render(<EventModuleGate moduleKey="wishlist">{"conteúdo da wishlist"}</EventModuleGate>);
    expect(screen.queryByText("conteúdo da wishlist")).not.toBeInTheDocument();
    expect(screen.getByText("Wishlist indisponível")).toBeInTheDocument();
  });

  it("always lets admins in", () => {
    setOverview({ isAdmin: true });
    render(<EventModuleGate moduleKey="wishlist">{"conteúdo da wishlist"}</EventModuleGate>);
    expect(screen.getByText("conteúdo da wishlist")).toBeInTheDocument();
  });
});
