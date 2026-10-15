"use client";

import type { EventOverviewDto } from "@/lib/api/types";

import type { CanhoesBottomTabEntry } from "./CanhoesBottomTabs";
import {
  ADMIN_NAV_ITEM,
  getNavigation,
  getPageContext,
  HOME_NAV_ITEM,
  MENU_NAV_ITEM,
} from "./canhoesNavigation";

function isHomePath(pathname: string | null) {
  return pathname === "/canhoes" || pathname === "/canhoes/";
}

function isPathActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === HOME_NAV_ITEM.href) return isHomePath(pathname);
  return pathname.startsWith(href);
}

function resolveUserLabel(user?: { email?: string | null; name?: string | null } | null) {
  return user?.name?.trim() || user?.email || "Membro";
}

/** Builds the dock, the menu sheet and the header text for the current page and user. */
export function useCanhoesShellNavigation({
  isAdmin,
  isMenuOpen,
  onNavigate,
  onOpenMenu,
  overview,
  pathname,
  user,
}: Readonly<{
  isAdmin: boolean;
  isMenuOpen: boolean;
  onNavigate: (href: string) => void;
  onOpenMenu: () => void;
  overview?: EventOverviewDto | null;
  pathname: string | null;
  user?: { email?: string | null; name?: string | null } | null;
}>) {
  const { dockItems, menuItems } = getNavigation(overview?.modules);

  const toEntry = (item: typeof HOME_NAV_ITEM): CanhoesBottomTabEntry => ({
    item,
    isActive: isPathActive(pathname, item.href),
    onClick: () => onNavigate(item.href),
  });

  // Admins get the admin area in the dock; members get the menu sheet with the remaining areas.
  const rightEntry: CanhoesBottomTabEntry = isAdmin
    ? toEntry(ADMIN_NAV_ITEM)
    : {
        item: MENU_NAV_ITEM,
        isActive: isMenuOpen || menuItems.some((item) => isPathActive(pathname, item.href)),
        onClick: onOpenMenu,
      };

  return {
    bottomLeftEntries: [toEntry(HOME_NAV_ITEM), ...dockItems.slice(0, 1).map(toEntry)],
    bottomRightEntries: [...dockItems.slice(1).map(toEntry), rightEntry],
    menuItems,
    isEventHomePath: isHomePath(pathname),
    pageContext: getPageContext(pathname),
    userLabel: resolveUserLabel(user),
  };
}
