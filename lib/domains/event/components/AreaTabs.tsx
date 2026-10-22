import { PillTabs } from "@/components/ui/pill-tabs";
import type { AdminModuleKey, EventModulesDto } from "@/lib/api/types";
import { CANHOES_MODULE_BY_KEY, CANHOES_MODULES } from "@/lib/modules";

/** Ligações entre as páginas abertas de uma área (nomeações e stickers, categorias e medidas); nada quando só há uma. */
export function AreaTabs({
  current,
  modules,
}: Readonly<{ current: AdminModuleKey; modules: EventModulesDto | null | undefined }>) {
  if (!modules) return null;

  const root = CANHOES_MODULE_BY_KEY[current].inMenuUnder ?? current;
  const pages = CANHOES_MODULES.filter(
    (module) => (module.key === root || module.inMenuUnder === root) && modules[module.key],
  );
  if (pages.length < 2) return null;

  return (
    <PillTabs
      activeId={current}
      items={pages.map((page) => ({ id: page.key, label: page.label, href: page.href }))}
      size="md"
    />
  );
}
