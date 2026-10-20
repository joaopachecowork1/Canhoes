import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { CanhoesWishlistModule } from "@/lib/domains/wishlist/components/CanhoesWishlistModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, PublicUserDto, EventWishlistItemDto, PagedResult } from "@/lib/api/types";

/** Página da wishlist: pré-carrega os membros e os itens de todos. */
export default async function WishlistPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const [initialMembers, initialWishlistData] = activeContext
    ? await Promise.all([
        canhoesServerFetch<PublicUserDto[]>(`events/${activeContext.event.id}/members`),
        canhoesServerFetch<PagedResult<EventWishlistItemDto>>(
          `events/${activeContext.event.id}/wishlist?skip=0&take=1000`,
        ),
      ])
    : [null, null];

  return (
    <EventModuleGate moduleKey="wishlist">
      <CanhoesWishlistModule
        initialContext={activeContext ?? undefined}
        initialMembers={initialMembers ?? undefined}
        initialWishlistItems={initialWishlistData?.items ?? undefined}
      />
    </EventModuleGate>
  );
}
