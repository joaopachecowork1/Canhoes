import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { CanhoesStickerSubmitModule } from "@/lib/domains/stickers/components/CanhoesStickerSubmitModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, AwardCategoryDto, NomineeDto, PagedResult } from "@/lib/api/types";

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
      <CanhoesStickerSubmitModule
        initialContext={activeContext ?? undefined}
        initialStickerCategories={initialCategories?.items ?? undefined}
        initialApprovedNominees={initialNominees ?? undefined}
      />
    </EventModuleGate>
  );
}
