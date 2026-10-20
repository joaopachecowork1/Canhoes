"use client";

import { useQuery } from "@tanstack/react-query";
import { eventRepo } from "@/lib/repositories/eventRepo";
import type { EventSecretSantaOverviewDto, EventWishlistItemDto, PagedResult } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";

/** What the page shows: the person you give to (once assigned) and their wishlist items. */
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

/** The user's secret santa assignment and the wishlist of the person they give to. */
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
    initialData: initialOverview ?? undefined,
  });

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
