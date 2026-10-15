import { BarChart2, FolderTree, Gavel, type LucideIcon } from "lucide-react";

import type { AdminModuleKey } from "@/lib/api/types";

export type AdminContentSectionId = "queue" | "categorias" | "resultados";

type AdminContentSectionCountContext = {
  categoriesCount: number;
  pendingCategoryProposalsCount: number;
  pendingMeasureProposalsCount: number;
  pendingNominationsCount: number;
  resultsCount: number;
};

export type AdminContentSectionItem = {
  count: number;
  description: string;
  icon: LucideIcon;
  id: AdminContentSectionId;
  label: string;
};

const ADMIN_CONTENT_SECTIONS = [
  {
    id: "queue",
    label: "Fila",
    description: "Propostas pendentes e moderação prioritária.",
    icon: Gavel,
    count: (context: AdminContentSectionCountContext) =>
      context.pendingNominationsCount +
      context.pendingCategoryProposalsCount +
      context.pendingMeasureProposalsCount,
  },
  {
    id: "categorias",
    label: "Categorias",
    description: "CRUD das categorias oficiais e campos relacionados.",
    icon: FolderTree,
    count: (context: AdminContentSectionCountContext) => context.categoriesCount,
  },
  {
    id: "resultados",
    label: "Resultados",
    description: "Resultados oficiais e auditoria isolados da moderação.",
    icon: BarChart2,
    count: (context: AdminContentSectionCountContext) => context.resultsCount,
  },
] as const;

const ADMIN_CONTENT_SECTION_IDS = ADMIN_CONTENT_SECTIONS.map((section) => section.id) as readonly AdminContentSectionId[];

export function isAdminContentSectionId(value: string): value is AdminContentSectionId {
  return ADMIN_CONTENT_SECTION_IDS.includes(value as AdminContentSectionId);
}

export function buildAdminContentSectionItems(
  context: Readonly<AdminContentSectionCountContext>
): AdminContentSectionItem[] {
  return ADMIN_CONTENT_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    icon: section.icon,
    count: section.count(context),
  }));
}

export function getDefaultAdminContentSection(): AdminContentSectionId {
  return "queue";
}

export const QUICK_ADMIN_MODULE_ORDER: readonly AdminModuleKey[] = [
  "feed",
  "nominees",
  "categories",
  "secretSanta",
] as const;

export const ADVANCED_ADMIN_MODULE_ORDER: readonly AdminModuleKey[] = [
  "wishlist",
  "voting",
  "stickers",
  "measures",
  "gala",
] as const;
