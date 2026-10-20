import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { apiRoute } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { router, setNavigation } from "@/tests/component/navigation";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { signInAs, signOut } from "@/tests/component/session";

import { CanhoesChrome } from "./CanhoesChrome";

const OPEN_AREAS = { feed: true, voting: true, gala: true, wishlist: true, stickers: true };

function renderChrome({ isAdmin = false, pathname = "/canhoes" } = {}) {
  signInAs({ isAdmin });
  setNavigation({ pathname });
  server.use(apiRoute("get", "events/active/context", makeEventContext({ isAdmin, modules: OPEN_AREAS })));
  return renderWithProviders(
    <CanhoesChrome>
      <p>{"Conteúdo da página"}</p>
    </CanhoesChrome>,
  );
}

const dock = () => screen.getByRole("navigation", { name: "Navegação principal do evento" });

describe("CanhoesChrome", () => {
  it("wraps the page with the header, the dock and the page title", async () => {
    renderChrome({ pathname: "/canhoes/votacao" });

    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
    expect(await within(dock()).findByRole("button", { name: "Votação" })).toBeInTheDocument();
    expect(within(dock()).getByRole("button", { name: "Gala" })).toBeInTheDocument();
    expect(document.title).toBe("Votação · Canhões 2026");
    // The page names itself in its own heading; the header does not say it a second time.
    expect(within(screen.getByRole("banner")).queryByText("Votação")).not.toBeInTheDocument();
  });

  it("navigates from the dock", async () => {
    renderChrome();

    await userEvent.click(await within(dock()).findByRole("button", { name: "Votação" }));
    expect(router.push).toHaveBeenCalledWith("/canhoes/votacao");
  });

  it("opens the menu with the other open areas and logs out from it", async () => {
    renderChrome();

    await userEvent.click(await within(dock()).findByRole("button", { name: "Mais" }));
    const menu = await screen.findByRole("navigation", { name: "Outras áreas" });
    expect(within(menu).getByText("Wishlist")).toBeInTheDocument();
    expect(within(menu).getByText("Stickers")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Terminar sessão/ }));
    expect(signOut).toHaveBeenCalled();
  });

  it("gives admins the admin tab instead of the menu", async () => {
    renderChrome({ isAdmin: true });

    expect(await within(dock()).findByRole("button", { name: "Admin" })).toBeInTheDocument();
    expect(within(dock()).queryByRole("button", { name: "Mais" })).not.toBeInTheDocument();
  });

  it("lets admins open the menu from the header to change their colour or log out", async () => {
    renderChrome({ isAdmin: true });

    await userEvent.click(await screen.findByRole("button", { name: "Abrir mais opções" }));
    expect(await screen.findByRole("radio", { name: "Turquesa" })).toBeChecked();
    expect(screen.getByRole("button", { name: /Terminar sessão/ })).toBeInTheDocument();
  });

  it("offers the post button when the mural is open", async () => {
    renderChrome();
    expect(await within(dock()).findByRole("button", { name: "Publicar" })).toBeInTheDocument();
  });
});
