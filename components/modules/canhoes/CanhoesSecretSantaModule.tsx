"use client";

import { Gift } from "lucide-react";

import type { EventActiveContextDto, EventSecretSantaOverviewDto, EventWishlistItemDto, PagedResult } from "@/lib/api/types";
import { CanhoesModuleHeader } from "@/components/modules/canhoes/CanhoesModuleParts";
import { useEventOverview } from "@/hooks/useEventOverview";
import { useSecretSanta } from "@/hooks/useSecretSanta";
import { getErrorMessage } from "@/lib/errors";
import { CANHOES_MEMBER_MODULE_MAP } from "@/lib/modules";

import { AssignedWishlistPanel } from "@/lib/domains/secretSanta/components/AssignedWishlistPanel";
import { SecretSantaContent } from "@/lib/domains/secretSanta/components/SecretSantaContent";
import { WishlistPreviewCard } from "@/lib/domains/secretSanta/components/WishlistPreviewCard";

function buildDefaultEventCode(eventId?: string | null) {
  if (eventId) return eventId;
  return `canhoes${new Date().getFullYear()}`;
}

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

  const wishlistHref = overview?.modules.wishlist ? CANHOES_MEMBER_MODULE_MAP.wishlist.href : "/canhoes";
  const wishlistLabel = overview?.modules.wishlist ? "Abrir wishlist" : "Voltar ao evento";

  const isBusy = isOverviewLoading || isLoading;
  const badgeLabel = data?.overview.drawEventCode || buildDefaultEventCode(eventId);
  const errorMessage = error ? getErrorMessage(error, "Erro ao carregar amigo secreto.") : null;

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Gift}
        title="Amigo Secreto"
        description="O sorteio, a pessoa que te calhou e a wishlist certa vivem no mesmo fluxo."
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
