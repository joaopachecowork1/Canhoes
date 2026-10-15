import type { LucideIcon } from "lucide-react";
import { Menu, ScrollText, Shield } from "lucide-react";

import type { EventModulesDto } from "@/lib/api/types";
import { CANHOES_MODULES } from "@/lib/modules";

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
};

type CanhoesPageTone = "admin" | "event" | "official" | "social";

export type CanhoesPageContext = {
  title: string;
  description?: string;
  tone: CanhoesPageTone;
  toneLabel: string;
};

export const HOME_NAV_ITEM: CanhoesNavItem = {
  id: "home",
  label: "Mural",
  href: "/canhoes",
  icon: ScrollText,
  description: "Posts, fotos e sondagens do grupo.",
};

export const ADMIN_NAV_ITEM: CanhoesNavItem = {
  id: "admin",
  label: "Admin",
  href: "/canhoes/admin",
  icon: Shield,
  description: "Fases, propostas, membros e todas as áreas do evento.",
};

export const MENU_NAV_ITEM: CanhoesNavItem = {
  id: "menu",
  label: "Menu",
  href: "#menu",
  icon: Menu,
};

const DOCK_AREA_COUNT = 2;

const TONE_LABELS: Record<CanhoesPageTone, string> = {
  admin: "Admin",
  event: "Evento",
  official: "Oficial",
  social: "Social",
};

const OFFICIAL_AREAS = new Set(["voting", "nominees", "categories", "gala"]);

/** Open member areas, in registry order; the mural is the home tab and never counted here. */
function getOpenAreas(modules: EventModulesDto | null | undefined): CanhoesNavItem[] {
  if (!modules) return [];
  return CANHOES_MODULES.filter((module) => module.key !== "feed" && modules[module.key]).map(
    (module) => ({
      id: module.key,
      label: module.label,
      href: module.href,
      icon: module.icon,
      description: module.description,
    })
  );
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
    return { title: "Mural", description: HOME_NAV_ITEM.description, tone: "social", toneLabel: TONE_LABELS.social };
  }

  let tone: CanhoesPageTone = "event";
  if (page.id === ADMIN_NAV_ITEM.id) tone = "admin";
  else if (OFFICIAL_AREAS.has(page.id)) tone = "official";

  return { title: page.label, description: page.description, tone, toneLabel: TONE_LABELS[tone] };
}
