import type { LucideIcon } from "lucide-react";
import { Menu, ScrollText, Shield } from "lucide-react";

import type { EventModulesDto } from "@/lib/api/types";
import { CANHOES_MODULES } from "@/lib/modules";
import messages from "@/messages/pt.json";

const copy = messages.shell.canhoesNavigation;

/*
 * Para onde a moldura da app liga. O dock tem Mural, as duas primeiras áreas abertas, Post e, à direita,
 * Admin (admins) ou Menu (membros); o menu lista as restantes áreas abertas. As áreas abertas vêm de
 * `overview.modules`, que segue a fase ativa, igual para admins e membros.
 */

/** Uma ligação de navegação (dock ou menu). */
export type CanhoesNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Outros caminhos que contam como estar neste item (as páginas agrupadas debaixo dele). */
  alsoActiveFor?: string[];
};

/** Título e cor da página atual, para o cabeçalho. */
export type CanhoesPageContext = {
  title: string;
  description?: string;
  /** A cor do separador da área (`--area-*` em app/globals.css), igual no cabeçalho e no dock. */
  areaColor: string;
};

/** Cor CSS do separador de uma área: `secretSanta` lê `--area-secret-santa`. */
export function areaColorVar(areaId: string) {
  const kebab = areaId.replaceAll(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
  return `var(--area-${kebab})`;
}

/** O mural, separador inicial do dock. */
export const HOME_NAV_ITEM: CanhoesNavItem = {
  id: "home",
  label: copy.homeLabel,
  href: "/canhoes",
  icon: ScrollText,
  description: copy.homeDescription,
};

/** A área de administração, no dock dos admins. */
export const ADMIN_NAV_ITEM: CanhoesNavItem = {
  id: "admin",
  label: copy.adminLabel,
  href: "/canhoes/admin",
  icon: Shield,
  description: copy.adminDescription,
};

/** O botão que abre o menu, no dock dos membros. */
export const MENU_NAV_ITEM: CanhoesNavItem = {
  id: "menu",
  label: messages.shell.common.menu,
  href: "#menu",
  icon: Menu,
};

// Quantas áreas cabem no dock ao lado do mural e do Post.
const DOCK_AREA_COUNT = 2;

/** Áreas abertas para os membros, pela ordem do registo; o mural é o separador inicial e não conta aqui. */
function getOpenAreas(modules: EventModulesDto | null | undefined): CanhoesNavItem[] {
  if (!modules) return [];
  // Uma página agrupada (stickers, medidas) chega-se pelos separadores da página-mãe; sozinha só quando a mãe está fechada.
  const isListed = (module: (typeof CANHOES_MODULES)[number]) =>
    module.key !== "feed" && modules[module.key] && !(module.inMenuUnder && modules[module.inMenuUnder]);
  return CANHOES_MODULES.filter(isListed).map((module) => ({
    id: module.key,
    label: module.label,
    href: module.href,
    icon: module.icon,
    description: module.description,
    alsoActiveFor: CANHOES_MODULES.filter((child) => child.inMenuUnder === module.key && modules[child.key]).map(
      (child) => child.href,
    ),
  }));
}

/** Reparte as áreas abertas entre o dock e o menu. */
export function getNavigation(modules: EventModulesDto | null | undefined) {
  const openAreas = getOpenAreas(modules);
  return {
    dockItems: openAreas.slice(0, DOCK_AREA_COUNT),
    menuItems: openAreas.slice(DOCK_AREA_COUNT),
  };
}

/** Título e cor para o cabeçalho, a partir da ligação que corresponde ao caminho. */
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
  const page = pathname ? pages.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`)) : undefined;

  if (!page) {
    return { title: HOME_NAV_ITEM.label, description: HOME_NAV_ITEM.description, areaColor: areaColorVar("feed") };
  }

  return { title: page.label, description: page.description, areaColor: areaColorVar(page.id) };
}
