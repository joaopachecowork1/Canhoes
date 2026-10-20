"use client";

import type { EventOverviewDto } from "@/lib/api/types";

import type { CanhoesBottomTabEntry } from "./CanhoesBottomTabs";
import { ADMIN_NAV_ITEM, getNavigation, getPageContext, HOME_NAV_ITEM, MENU_NAV_ITEM } from "./canhoesNavigation";
import messages from "@/messages/pt.json";

/** Diz se o caminho é a página inicial (com ou sem barra final). */
function isHomePath(pathname: string | null) {
  return pathname === "/canhoes" || pathname === "/canhoes/";
}

/** Diz se o `href` corresponde ao caminho atual; a página inicial compara por igualdade, as outras por prefixo. */
function isPathActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === HOME_NAV_ITEM.href) return isHomePath(pathname);
  return pathname.startsWith(href);
}

function isItemActive(pathname: string | null, item: { href: string; alsoActiveFor?: string[] }) {
  return isPathActive(pathname, item.href) || (item.alsoActiveFor ?? []).some((href) => isPathActive(pathname, href));
}

function resolveUserLabel(user?: { email?: string | null; name?: string | null } | null) {
  return user?.name?.trim() || user?.email || messages.shell.useCanhoesShellNavigation.memberFallback;
}

/** Constrói o dock, a folha de menu e o texto do cabeçalho para a página e o utilizador atuais. */
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
    isActive: isItemActive(pathname, item),
    onClick: () => onNavigate(item.href),
  });

  // Os admins têm a área de admin no dock; os membros têm a folha de menu com as restantes áreas.
  const rightEntry: CanhoesBottomTabEntry = isAdmin
    ? toEntry(ADMIN_NAV_ITEM)
    : {
        item: MENU_NAV_ITEM,
        isActive: isMenuOpen || menuItems.some((item) => isItemActive(pathname, item)),
        onClick: onOpenMenu,
      };

  return {
    bottomLeftEntries: [toEntry(HOME_NAV_ITEM), ...dockItems.slice(0, 1).map(toEntry)],
    bottomRightEntries: [...dockItems.slice(1).map(toEntry), rightEntry],
    menuItems,
    pageContext: getPageContext(pathname),
    userLabel: resolveUserLabel(user),
  };
}
