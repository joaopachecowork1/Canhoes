import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { makeEventContext } from "@/tests/component/eventContext";

import { CanhoesHomeDashboard } from "./CanhoesHomeDashboard";

describe("CanhoesHomeDashboard", () => {
  afterEach(() => localStorage.clear());

  it("points to the area of the active phase and up to three shortcuts", () => {
    render(
      <CanhoesHomeDashboard
        context={makeEventContext({ phaseType: "VOTING", modules: { feed: true, voting: true, gala: true, wishlist: true, stickers: true, measures: true } })}
      />
    );

    expect(screen.getByRole("link", { name: /Próximo passo.*Votação/ })).toHaveAttribute("href", "/canhoes/votacao");
    const shortcuts = screen.getByRole("navigation", { name: "Atalhos da edição" });
    expect(shortcuts.querySelectorAll("a")).toHaveLength(3);
  });

  it("invites to post when no area is open", () => {
    render(<CanhoesHomeDashboard context={null} />);
    expect(screen.getByText("O mural está pronto.")).toBeInTheDocument();
  });

  it("collapses the shortcuts and remembers it", async () => {
    const { unmount } = render(<CanhoesHomeDashboard context={makeEventContext({ modules: { wishlist: true } })} />);

    await userEvent.click(screen.getByRole("button", { name: "Esconder" }));
    expect(screen.getByText("Atalhos ocultos")).toBeInTheDocument();
    expect(localStorage.getItem("canhoes:home-dashboard-collapsed")).toBe("true");
    unmount();

    render(<CanhoesHomeDashboard context={makeEventContext({ modules: { wishlist: true } })} />);
    expect(screen.getByRole("button", { name: "Mostrar" })).toHaveAttribute("aria-expanded", "false");
  });
});
