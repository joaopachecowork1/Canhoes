"use client";

import { PillTabs } from "@/components/ui/pill-tabs";

import { ADMIN_SECTIONS, type AdminSectionId } from "../adminSections";

const ADMIN_TAB_ITEMS = ADMIN_SECTIONS.map((section) => ({
  ...section,
  href: `/canhoes/admin/${section.id}`,
}));

/** Separadores de navegação entre as secções do admin; cada um é uma ligação para a sua rota. */
export function AdminRouteTabs({ activeId }: Readonly<{ activeId: AdminSectionId }>) {
  return (
    <PillTabs
      items={ADMIN_TAB_ITEMS}
      activeId={activeId}
      size="sm"
      stretch
      className="text-[var(--color-text-primary)]"
    />
  );
}
