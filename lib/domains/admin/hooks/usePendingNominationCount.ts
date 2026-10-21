"use client";

import { useQuery } from "@tanstack/react-query";

import { adminRepo } from "@/lib/repositories/adminRepo";
import { queryKeys } from "@/lib/queryKeys";

/** Conta as nomeações por rever (pedido de uma só linha, só interessa o total). */
export function usePendingNominationCount(eventId: string | null) {
  return useQuery({
    enabled: !!eventId,
    queryFn: () => adminRepo.getNominationsPaged(eventId ?? "", 0, 1, "pending"),
    queryKey: queryKeys.admin.nominationsPendingCount(eventId),
    refetchOnWindowFocus: false,
    select: (data) => data.total,
    staleTime: 1000 * 60 * 2,
  });
}
