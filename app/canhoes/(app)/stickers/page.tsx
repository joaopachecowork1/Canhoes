import { AreaTabs } from "@/lib/domains/event/components/AreaTabs";
import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { CanhoesStickerSubmitModule } from "@/lib/domains/stickers/components/CanhoesStickerSubmitModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, AwardCategoryDto, NomineeDto, PagedResult } from "@/lib/api/types";

/** Página dos stickers: pré-carrega as categorias e os nomeados aprovados. */
export default async function StickersPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const [initialCategories, initialNominees] = activeContext
    ? await Promise.all([
        canhoesServerFetch<PagedResult<AwardCategoryDto>>(`events/${activeContext.event.id}/categories?skip=0&take=50`),
        canhoesServerFetch<NomineeDto[]>(`events/${activeContext.event.id}/nominations/approved`),
      ])
    : [null, null];

  return (
    <EventModuleGate moduleKey="stickers">
      <div className="space-y-4">
        <AreaTabs current="stickers" modules={activeContext?.overview.modules} />
        <CanhoesStickerSubmitModule
          initialContext={activeContext ?? undefined}
          initialStickerCategories={initialCategories?.items ?? undefined}
          initialApprovedNominees={initialNominees ?? undefined}
        />
      </div>
    </EventModuleGate>
  );
}
