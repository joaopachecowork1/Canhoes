import { AreaTabs } from "@/lib/domains/event/components/AreaTabs";
import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { CanhoesCategoriesModule } from "@/lib/domains/categories/components/CanhoesCategoriesModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, AwardCategoryDto, PagedResult } from "@/lib/api/types";

/** Página das categorias: pré-carrega a primeira página de categorias do evento ativo. */
export default async function CategoriasPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const initialCategories = activeContext
    ? await canhoesServerFetch<PagedResult<AwardCategoryDto>>(
        `events/${activeContext.event.id}/categories?skip=0&take=50`,
      )
    : null;

  return (
    <EventModuleGate moduleKey="categories">
      <div className="space-y-4">
        <AreaTabs current="categories" modules={activeContext?.overview.modules} />
        <CanhoesCategoriesModule
          initialContext={activeContext ?? undefined}
          initialCategories={initialCategories?.items ?? undefined}
        />
      </div>
    </EventModuleGate>
  );
}
