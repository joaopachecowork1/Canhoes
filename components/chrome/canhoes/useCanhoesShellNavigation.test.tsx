import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useCanhoesShellNavigation } from "./useCanhoesShellNavigation";
import type { EventOverviewDto } from "@/lib/api/types";

function overviewWith(openModules: string[]): EventOverviewDto {
  return {
    event: { id: "event-1", name: "Canhões 2026", isActive: true },
    activePhase: null,
    permissions: { isAdmin: false, canSubmitProposal: false, canVote: false },
    modules: Object.fromEntries(openModules.map((key) => [key, true])),
  };
}

function buildNavigation(overrides: Partial<Parameters<typeof useCanhoesShellNavigation>[0]> = {}) {
  const { result } = renderHook(() =>
    useCanhoesShellNavigation({
      isAdmin: false,
      isMenuOpen: false,
      onNavigate: vi.fn(),
      onOpenMenu: vi.fn(),
      overview: overviewWith(["voting", "gala", "wishlist", "stickers"]),
      pathname: "/canhoes",
      user: { name: "Ana", email: "ana@example.com" },
      ...overrides,
    }),
  );
  return result.current;
}

const ids = (entries: { item: { id: string } }[]) => entries.map(({ item }) => item.id);

describe("useCanhoesShellNavigation", () => {
  it("puts the mural and the first two open areas in the dock and the rest in the menu", () => {
    const navigation = buildNavigation();

    expect(ids(navigation.bottomLeftEntries)).toEqual(["home", "voting"]);
    expect(ids(navigation.bottomRightEntries)).toEqual(["gala", "menu"]);
    expect(navigation.menuItems.map((item) => item.id)).toEqual(["wishlist", "stickers"]);
  });

  it("gives admins the admin tab instead of the menu", () => {
    const navigation = buildNavigation({ isAdmin: true });
    expect(ids(navigation.bottomRightEntries)).toEqual(["gala", "admin"]);
  });

  it("shows only the mural and the menu when no area is open", () => {
    const navigation = buildNavigation({ overview: null });

    expect(ids(navigation.bottomLeftEntries)).toEqual(["home"]);
    expect(ids(navigation.bottomRightEntries)).toEqual(["menu"]);
    expect(navigation.menuItems).toEqual([]);
  });

  it("marks the mural active only on the home path", () => {
    const [home] = buildNavigation({ pathname: "/canhoes/" }).bottomLeftEntries;
    const [homeElsewhere, voting] = buildNavigation({ pathname: "/canhoes/votacao" }).bottomLeftEntries;

    expect(home.isActive).toBe(true);
    expect(homeElsewhere.isActive).toBe(false);
    expect(voting.isActive).toBe(true);
  });

  it("marks the menu active while it is open or on one of its areas", () => {
    const menuEntry = (overrides: Parameters<typeof buildNavigation>[0]) =>
      buildNavigation(overrides).bottomRightEntries.at(-1);

    expect(menuEntry({})?.isActive).toBe(false);
    expect(menuEntry({ isMenuOpen: true })?.isActive).toBe(true);
    expect(menuEntry({ pathname: "/canhoes/stickers" })?.isActive).toBe(true);
  });

  it("navigates to the tab's link and opens the menu from the menu tab", () => {
    const onNavigate = vi.fn();
    const onOpenMenu = vi.fn();
    const navigation = buildNavigation({ onNavigate, onOpenMenu });

    navigation.bottomLeftEntries[1].onClick();
    navigation.bottomRightEntries.at(-1)?.onClick();

    expect(onNavigate).toHaveBeenCalledWith("/canhoes/votacao");
    expect(onOpenMenu).toHaveBeenCalledOnce();
  });

  it("titles the header after the current area, in its colour", () => {
    expect(buildNavigation({ pathname: "/canhoes/votacao/123" }).pageContext).toMatchObject({
      areaColor: "var(--area-voting)",
    });
    expect(buildNavigation({ pathname: "/canhoes/wishlist" }).pageContext).toMatchObject({
      areaColor: "var(--area-wishlist)",
    });
    expect(buildNavigation({ pathname: "/canhoes/admin" }).pageContext).toMatchObject({
      title: "Admin",
      areaColor: "var(--area-admin)",
    });
    expect(buildNavigation({ pathname: null }).pageContext).toMatchObject({
      title: "Mural",
      areaColor: "var(--area-feed)",
    });
  });

  it("labels the user by name, then email, then a fallback", () => {
    expect(buildNavigation().userLabel).toBe("Ana");
    expect(buildNavigation({ user: { name: "  ", email: "ana@example.com" } }).userLabel).toBe("ana@example.com");
    expect(buildNavigation({ user: null }).userLabel).toBe("Membro");
  });
});
