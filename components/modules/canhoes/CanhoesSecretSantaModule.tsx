"use client";

import { Gift } from "lucide-react";

import type { EventActiveContextDto, EventSecretSantaOverviewDto, EventWishlistItemDto, PagedResult } from "@/lib/api/types";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/hooks/useEventOverview";
import { useSecretSanta } from "@/hooks/useSecretSanta";
import { getErrorMessage } from "@/lib/errors";
import { CANHOES_MODULE_BY_KEY } from "@/lib/modules";

import { AssignedWishlistPanel } from "@/lib/domains/secretSanta/components/AssignedWishlistPanel";
import { SecretSantaContent } from "@/lib/domains/secretSanta/components/SecretSantaContent";
import { WishlistPreviewCard } from "@/lib/domains/secretSanta/components/WishlistPreviewCard";

/** Amigo secreto page: who you give a present to, once the draw is revealed, and their wishlist. */
export function CanhoesSecretSantaModule({ initialContext, initialSecretSantaOverview, initialWishlistData }: {
    initialContext?: EventActiveContextDto | null;
    initialSecretSantaOverview?: EventSecretSantaOverviewDto | null;
    initialWishlistData?: PagedResult<EventWishlistItemDto> | null;
}) {
  const { event, overview, isLoading: isOverviewLoading } = useEventOverview(initialContext);
  const eventId = event?.id;

  const { data, isLoading, error, refetch } = useSecretSanta(eventId, initialSecretSantaOverview, initialWishlistData);

  const assignedWishlistItems = data?.overview.assignedUser
    ? data.wishlistItems.filter((item) => item.userId === data.overview.assignedUser?.id)
    : [];

  const wishlistHref = overview?.modules.wishlist ? CANHOES_MODULE_BY_KEY.wishlist.href : "/canhoes";
  const wishlistLabel = overview?.modules.wishlist ? "Abrir wishlist" : "Voltar ao evento";

  const isBusy = isOverviewLoading || isLoading;
  const badgeLabel = data?.overview.hasDraw ? "Sorteio feito" : "Sorteio por fazer";
  const errorMessage = error ? getErrorMessage(error, "Erro ao carregar amigo secreto.") : null;

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Gift}
        title="Amigo Secreto"
        description="Vê a quem te calhou oferecer e a wishlist dessa pessoa."
        badgeLabel={badgeLabel}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SecretSantaContent
          assignedUserName={data?.overview.assignedUser?.name}
          assignedWishlistItems={assignedWishlistItems}
          errorMessage={errorMessage}
          hasAssignment={Boolean(data?.overview.hasAssignment)}
          hasDraw={Boolean(data?.overview.hasDraw)}
          isBusy={isBusy}
          onRetry={() => void refetch()}
          wishlistHref={wishlistHref}
          wishlistLabel={wishlistLabel}
        />
        <WishlistPreviewCard
          myWishlistItemCount={data?.overview.myWishlistItemCount ?? 0}
          wishlistHref={wishlistHref}
          wishlistLabel={wishlistLabel}
        />
      </div>

      {data?.overview.hasAssignment && data.overview.assignedUser ? (
        <AssignedWishlistPanel
          assignedUserName={data.overview.assignedUser.name}
          assignedWishlistItems={assignedWishlistItems}
        />
      ) : null}
    </div>
  );
}
