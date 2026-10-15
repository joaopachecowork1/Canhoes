"use client";

import { useQuery } from "@tanstack/react-query";
import { eventRepo } from "@/lib/repositories/eventRepo";
import type { EventSecretSantaOverviewDto, EventWishlistItemDto, PagedResult } from "@/lib/api/types";

export function useSecretSanta(
  eventId?: string,
  initialOverview?: EventSecretSantaOverviewDto | null,
  initialWishlistData?: PagedResult<EventWishlistItemDto> | null
) {
  const { data: overview, isLoading, error, refetch } = useQuery({
    queryKey: ["secretSantaOverview", eventId],
    queryFn: () => eventRepo.getSecretSantaOverview(eventId!),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5,
    initialData: initialOverview ?? undefined,
  });

  const { data: wishlistData } = useQuery({
    queryKey: ["wishlist", eventId, 0, 1000],
    queryFn: () => eventRepo.getWishlist(eventId!, 0, 1000),
    enabled: !!eventId && !!overview?.hasAssignment,
    initialData: (overview?.hasAssignment && initialWishlistData) ? initialWishlistData : undefined,
  });

  return {
    data: overview ? { overview, wishlistItems: wishlistData?.items ?? [] } : null,
    overview: overview ?? null,
    isLoading: isLoading,
    error,
    refetch,
  };
}
