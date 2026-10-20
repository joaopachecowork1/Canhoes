"use client";

import type { EventActiveContextDto, EventSecretSantaOverviewDto, EventWishlistItemDto, PagedResult } from "@/lib/api/types";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { useSecretSanta } from "@/lib/domains/secretSanta/hooks/useSecretSanta";
import { getErrorMessage } from "@/lib/errors";
import { CANHOES_MODULE_BY_KEY } from "@/lib/modules";

import { AssignedWishlistPanel } from "@/lib/domains/secretSanta/components/AssignedWishlistPanel";
import { SecretSantaContent } from "@/lib/domains/secretSanta/components/SecretSantaContent";
import { WishlistPreviewCard } from "@/lib/domains/secretSanta/components/WishlistPreviewCard";
import messages from "@/messages/pt.json";

const copy = messages.secretSanta.CanhoesSecretSantaModule;

/** Where the wishlist button goes: the wishlist while it is open, else back to the event. */
function getWishlistLink(isWishlistOpen: boolean) {
  return isWishlistOpen
    ? { href: CANHOES_MODULE_BY_KEY.wishlist.href, label: copy.openWishlist }
    : { href: "/canhoes", label: messages.common.backToEvent };
}

/** Amigo secreto page: who you give a present to, once the draw is revealed, and their wishlist. */
export function CanhoesSecretSantaModule({ initialContext, initialSecretSantaOverview, initialWishlistData }: {
    initialContext?: EventActiveContextDto | null;
    initialSecretSantaOverview?: EventSecretSantaOverviewDto | null;
    initialWishlistData?: PagedResult<EventWishlistItemDto> | null;
}) {
  const { event, overview, isLoading: isOverviewLoading } = useEventOverview(initialContext);
  const eventId = event?.id;

  const secretSanta = useSecretSanta(eventId, initialSecretSantaOverview, initialWishlistData);
  const { assignedUser, assignedWishlistItems } = secretSanta;
  const { href: wishlistHref, label: wishlistLabel } = getWishlistLink(Boolean(overview?.modules.wishlist));
  const errorMessage = secretSanta.error ? getErrorMessage(secretSanta.error, copy.loadError) : null;

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        module="secretSanta"
        title={copy.title}
        description={copy.description}
        badgeLabel={secretSanta.hasDraw ? copy.drawDone : copy.drawPending}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SecretSantaContent
          assignedUserName={assignedUser?.name}
          assignedWishlistItems={assignedWishlistItems}
          errorMessage={errorMessage}
          hasAssignment={Boolean(assignedUser)}
          hasDraw={secretSanta.hasDraw}
          isBusy={isOverviewLoading || secretSanta.isLoading}
          onRetry={() => void secretSanta.refetch()}
          wishlistHref={wishlistHref}
          wishlistLabel={wishlistLabel}
        />
        <WishlistPreviewCard
          myWishlistItemCount={secretSanta.myWishlistItemCount}
          wishlistHref={wishlistHref}
          wishlistLabel={wishlistLabel}
        />
      </div>

      {assignedUser ? (
        <AssignedWishlistPanel
          assignedUserName={assignedUser.name}
          assignedWishlistItems={assignedWishlistItems}
        />
      ) : null}
    </div>
  );
}
