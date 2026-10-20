"use client";

import { useQuery } from "@tanstack/react-query";
import { eventRepo } from "@/lib/repositories/eventRepo";
import type { EventSecretSantaOverviewDto, EventWishlistItemDto, PagedResult } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";

/** O que a página mostra: a pessoa a quem se dá (depois do sorteio) e os itens da sua wishlist. */
function toSecretSantaView(overview: EventSecretSantaOverviewDto | undefined, wishlistItems: EventWishlistItemDto[]) {
  if (!overview) return { hasDraw: false, assignedUser: null, assignedWishlistItems: [], myWishlistItemCount: 0 };

  const assignedUser = overview.hasAssignment ? overview.assignedUser : null;
  return {
    hasDraw: overview.hasDraw,
    assignedUser,
    assignedWishlistItems: assignedUser ? wishlistItems.filter((item) => item.userId === assignedUser.id) : [],
    myWishlistItemCount: overview.myWishlistItemCount,
  };
}

/** A atribuição do amigo secreto do utilizador e a wishlist da pessoa a quem dá. */
export function useSecretSanta(
  eventId?: string,
  initialOverview?: EventSecretSantaOverviewDto | null,
  initialWishlistData?: PagedResult<EventWishlistItemDto> | null,
) {
  const {
    data: overview,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.secretSantaOverview(eventId),
    queryFn: () => eventRepo.getSecretSantaOverview(eventId ?? ""),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5,
    // Os dados iniciais vêm do servidor e evitam um primeiro pedido.
    initialData: initialOverview ?? undefined,
  });

  // A wishlist só é pedida depois de haver atribuição: antes disso não há a quem pertencer.
  const hasAssignment = Boolean(overview?.hasAssignment);
  const { data: wishlistData } = useQuery({
    queryKey: queryKeys.secretSantaWishlist(eventId),
    queryFn: () => eventRepo.getWishlist(eventId ?? "", 0, 1000),
    enabled: !!eventId && hasAssignment,
    initialData: hasAssignment ? (initialWishlistData ?? undefined) : undefined,
  });

  return {
    ...toSecretSantaView(overview, wishlistData?.items ?? []),
    isLoading,
    error,
    refetch,
  };
}
