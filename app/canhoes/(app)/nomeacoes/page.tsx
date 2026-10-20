import { AreaTabs } from "@/lib/domains/event/components/AreaTabs";
import { CanhoesNominationsModule } from "@/lib/domains/voting/components/CanhoesNominationsModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, AwardCategoryDto, PagedResult } from "@/lib/api/types";

export default async function NominationsPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const categoriesPage = activeContext
    ? await canhoesServerFetch<PagedResult<AwardCategoryDto>>(
        `events/${activeContext.event.id}/categories?skip=0&take=50`,
      )
    : null;
  const initialCategories = categoriesPage?.items ?? undefined;

  return (
    <div className="space-y-4">
      <AreaTabs current="nominees" modules={activeContext?.overview.modules} />
      <CanhoesNominationsModule initialCategories={initialCategories} initialContext={activeContext ?? undefined} />
    </div>
  );
}
