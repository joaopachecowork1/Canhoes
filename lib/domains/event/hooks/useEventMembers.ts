"use client";

import { useQuery } from "@tanstack/react-query";

import type { PublicUserDto } from "@/lib/api/types";
import { eventRepo } from "@/lib/repositories/eventRepo";
import { queryKeys } from "@/lib/queryKeys";

const STALE_TIME_MS = 1000 * 60 * 2;

/** The event's members, cached once for every screen that shows them (mural strip, wishlist). */
export function useEventMembers(eventId: string | null, initialMembers?: PublicUserDto[]) {
  return useQuery({
    queryKey: queryKeys.eventMembers(eventId),
    queryFn: () => eventRepo.getMembers(eventId ?? "").then((response) => (Array.isArray(response) ? response : [])),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    initialData: initialMembers,
  });
}
