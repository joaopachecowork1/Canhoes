import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { signInAs } from "@/tests/component/session";

import { CanhoesMenuSheet } from "./CanhoesMenuSheet";
import { getNavigation } from "./canhoesNavigation";

describe("CanhoesMenuSheet", () => {
  it("paints each area's icon with the area's own colour", () => {
    signInAs({});
    const { menuItems } = getNavigation({
      feed: true,
      voting: true,
      gala: true,
      wishlist: true,
      stickers: true,
    } as never);

    renderWithProviders(
      <CanhoesMenuSheet
        isAdmin={false}
        items={menuItems}
        onLogout={vi.fn()}
        onOpenChange={vi.fn()}
        open
        pathname="/canhoes"
      />,
    );

    expect(screen.getByRole("link", { name: /Stickers/ }).style.getPropertyValue("--area")).toBe(
      "var(--area-stickers)",
    );
    expect(screen.getByRole("link", { name: /Wishlist/ }).style.getPropertyValue("--area")).toBe(
      "var(--area-wishlist)",
    );
  });

  it("keeps the system links out of the green that means state, using neutral area colours", () => {
    signInAs({ isAdmin: true });

    renderWithProviders(
      <CanhoesMenuSheet isAdmin items={[]} onLogout={vi.fn()} onOpenChange={vi.fn()} open pathname="/canhoes" />,
    );

    expect(screen.getByRole("link", { name: /Todas as áreas/ }).style.getPropertyValue("--area")).toBe(
      "var(--area-admin)",
    );
    expect(screen.getByRole("link", { name: /Ver as boas-vindas/ }).style.getPropertyValue("--area")).toBe(
      "var(--area-welcome)",
    );
  });

  it("brings the welcome back for someone who already dismissed it", async () => {
    signInAs({});
    localStorage.setItem("canhoes:welcome-dismissed", "true");
    const onOpenChange = vi.fn();

    renderWithProviders(
      <CanhoesMenuSheet
        isAdmin={false}
        items={[]}
        onLogout={vi.fn()}
        onOpenChange={onOpenChange}
        open
        pathname="/canhoes/wishlist"
      />,
    );
    await userEvent.click(screen.getByRole("link", { name: /Ver as boas-vindas/ }));

    expect(localStorage.getItem("canhoes:welcome-dismissed")).toBe("false");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    localStorage.clear();
  });
});
