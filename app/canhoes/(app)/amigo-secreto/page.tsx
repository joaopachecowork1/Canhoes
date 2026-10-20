import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { CanhoesSecretSantaModule } from "@/lib/domains/secretSanta/components/CanhoesSecretSantaModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type {
  EventActiveContextDto,
  EventSecretSantaOverviewDto,
  EventWishlistItemDto,
  PagedResult,
} from "@/lib/api/types";

export default async function AmigoSecretoPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const [initialOverview, initialWishlistData] = activeContext
    ? await Promise.all([
        canhoesServerFetch<EventSecretSantaOverviewDto>(`events/${activeContext.event.id}/secret-santa/overview`),
        canhoesServerFetch<PagedResult<EventWishlistItemDto>>(
          `events/${activeContext.event.id}/wishlist?skip=0&take=1000`,
        ),
      ])
    : [null, null];

  return (
    <EventModuleGate moduleKey="secretSanta">
      <CanhoesSecretSantaModule
        initialContext={activeContext ?? undefined}
        initialSecretSantaOverview={initialOverview ?? undefined}
        initialWishlistData={initialWishlistData ?? undefined}
      />
    </EventModuleGate>
  );
}
