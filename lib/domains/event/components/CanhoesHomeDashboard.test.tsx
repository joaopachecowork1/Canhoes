import { afterEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { apiRoute } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesHomeDashboard } from "./CanhoesHomeDashboard";

describe("CanhoesHomeDashboard", () => {
  afterEach(() => localStorage.clear());

  it("points to the area of the active phase and up to three shortcuts", async () => {
    renderWithProviders(
      <CanhoesHomeDashboard
        context={makeEventContext({
          phaseType: "VOTING",
          modules: { feed: true, voting: true, gala: true, wishlist: true, stickers: true, measures: true },
        })}
      />,
    );

    expect(screen.getByRole("link", { name: /Próximo passo.*Votação/ })).toHaveAttribute("href", "/canhoes/votacao");
    await userEvent.click(await screen.findByRole("button", { name: "Mostrar atalhos" }));
    const shortcuts = screen.getByRole("navigation", { name: "Atalhos da edição" });
    expect(shortcuts.querySelectorAll("a")).toHaveLength(3);
  });

  it("colours each shortcut with its area's colour", async () => {
    renderWithProviders(
      <CanhoesHomeDashboard
        context={makeEventContext({ phaseType: "VOTING", modules: { voting: true, wishlist: true } })}
      />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Mostrar atalhos" }));
    const shortcuts = screen.getByRole("navigation", { name: "Atalhos da edição" });
    expect(shortcuts.querySelector("a")?.style.getPropertyValue("--area")).toBe("var(--area-wishlist)");
  });

  it("invites to post when no area is open and hides the shortcuts button", () => {
    server.use(apiRoute("get", "events/active/context", null, 404));
    renderWithProviders(<CanhoesHomeDashboard context={null} />);
    expect(screen.getByText("O mural está pronto.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /atalhos/i })).not.toBeInTheDocument();
  });

  it("loads the overview from the client cache when the server context is null", async () => {
    server.use(
      apiRoute(
        "get",
        "events/active/context",
        makeEventContext({ phaseType: "VOTING", modules: { voting: true, wishlist: true } }),
      ),
    );
    renderWithProviders(<CanhoesHomeDashboard context={null} />);

    expect(await screen.findByRole("link", { name: /Próximo passo.*Votação/ })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Mostrar atalhos" })).toBeInTheDocument();
  });

  it("keeps the shortcuts folded until asked, with the next step always in view", () => {
    renderWithProviders(
      <CanhoesHomeDashboard
        context={makeEventContext({ phaseType: "VOTING", modules: { voting: true, wishlist: true } })}
      />,
    );

    expect(screen.getByRole("link", { name: /Próximo passo.*Votação/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mostrar atalhos" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Atalhos da edição" })).not.toBeInTheDocument();
  });

  it("opens the shortcuts and remembers it", async () => {
    const { unmount } = renderWithProviders(
      <CanhoesHomeDashboard
        context={makeEventContext({ phaseType: "VOTING", modules: { voting: true, wishlist: true } })}
      />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Mostrar atalhos" }));
    expect(screen.getByRole("navigation", { name: "Atalhos da edição" })).toBeVisible();
    expect(localStorage.getItem("canhoes:home-shortcuts-expanded")).toBe("true");
    unmount();

    renderWithProviders(
      <CanhoesHomeDashboard
        context={makeEventContext({ phaseType: "VOTING", modules: { voting: true, wishlist: true } })}
      />,
    );
    expect(screen.getByRole("button", { name: "Esconder atalhos" })).toHaveAttribute("aria-expanded", "true");
  });

  it("welcomes a first visit once and explains what to do first", async () => {
    const { unmount } = renderWithProviders(
      <CanhoesHomeDashboard context={makeEventContext({ modules: { wishlist: true } })} />,
    );

    expect(await screen.findByRole("heading", { name: "Bem-vindo aos Canhões do Ano" })).toBeInTheDocument();
    expect(screen.getByText(/Preenche a tua wishlist/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Percebi" }));
    expect(screen.queryByRole("heading", { name: "Bem-vindo aos Canhões do Ano" })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<CanhoesHomeDashboard context={makeEventContext({ modules: { wishlist: true } })} />);
    expect(screen.queryByRole("heading", { name: "Bem-vindo aos Canhões do Ano" })).not.toBeInTheDocument();
  });

  it("keeps the welcome away from someone who already dismissed it in this browser", () => {
    localStorage.setItem("canhoes:welcome-dismissed", "true");

    renderWithProviders(<CanhoesHomeDashboard context={makeEventContext({ modules: { wishlist: true } })} />);

    expect(screen.queryByRole("heading", { name: "Bem-vindo aos Canhões do Ano" })).not.toBeInTheDocument();
  });
});
