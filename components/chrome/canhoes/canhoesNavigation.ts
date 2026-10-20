import type { LucideIcon } from "lucide-react";
import { Menu, ScrollText, Shield } from "lucide-react";

import type { EventModulesDto } from "@/lib/api/types";
import { CANHOES_MODULES } from "@/lib/modules";
import messages from "@/messages/pt.json";

const copy = messages.shell.canhoesNavigation;

/*
 * What the shell links to. The dock has Mural, the first two open areas, Post and, on the right,
 * Admin (admins) or Menu (members); the menu sheet lists every other open area. Which areas are
 * open comes from `overview.modules`, which follows the active phase for admins and members alike.
 */

export type CanhoesNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Other paths that count as being on this item (the pages grouped under it). */
  alsoActiveFor?: string[];
};

export type CanhoesPageContext = {
  title: string;
  description?: string;
  /** The area's tab colour (`--area-*` in app/globals.css), the same in header and dock. */
  areaColor: string;
};

/** CSS colour of an area's tab: `secretSanta` reads `--area-secret-santa`. */
export function areaColorVar(areaId: string) {
  const kebab = areaId.replaceAll(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
  return `var(--area-${kebab})`;
}

export const HOME_NAV_ITEM: CanhoesNavItem = {
  id: "home",
  label: copy.homeLabel,
  href: "/canhoes",
  icon: ScrollText,
  description: copy.homeDescription,
};

export const ADMIN_NAV_ITEM: CanhoesNavItem = {
  id: "admin",
  label: copy.adminLabel,
  href: "/canhoes/admin",
  icon: Shield,
  description: copy.adminDescription,
};

export const MENU_NAV_ITEM: CanhoesNavItem = {
  id: "menu",
  label: messages.shell.common.menu,
  href: "#menu",
  icon: Menu,
};

const DOCK_AREA_COUNT = 2;

/** Open member areas, in registry order; the mural is the home tab and never counted here. */
function getOpenAreas(modules: EventModulesDto | null | undefined): CanhoesNavItem[] {
  if (!modules) return [];
  // A grouped page (stickers, measures) is reached from its parent's tabs; on its own only when the parent is closed.
  const isListed = (module: (typeof CANHOES_MODULES)[number]) =>
    module.key !== "feed" && modules[module.key] && !(module.inMenuUnder && modules[module.inMenuUnder]);
  return CANHOES_MODULES.filter(isListed).map((module) => ({
    id: module.key,
    label: module.label,
    href: module.href,
    icon: module.icon,
    description: module.description,
    alsoActiveFor: CANHOES_MODULES.filter((child) => child.inMenuUnder === module.key && modules[child.key]).map((child) => child.href),
  }));
}

/** Splits the open areas between the dock and the menu sheet. */
export function getNavigation(modules: EventModulesDto | null | undefined) {
  const openAreas = getOpenAreas(modules);
  return {
    dockItems: openAreas.slice(0, DOCK_AREA_COUNT),
    menuItems: openAreas.slice(DOCK_AREA_COUNT),
  };
}

/** Title and tone for the header, from the longest matching link. */
export function getPageContext(pathname: string | null): CanhoesPageContext {
  const pages = [
    ADMIN_NAV_ITEM,
    ...CANHOES_MODULES.filter((module) => module.key !== "feed").map((module) => ({
      id: module.key,
      label: module.label,
      description: module.description,
      href: module.href,
    })),
  ];
  const page = pathname
    ? pages.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    : undefined;

  if (!page) {
    return { title: HOME_NAV_ITEM.label, description: HOME_NAV_ITEM.description, areaColor: areaColorVar("feed") };
  }

  return { title: page.label, description: page.description, areaColor: areaColorVar(page.id) };
}
