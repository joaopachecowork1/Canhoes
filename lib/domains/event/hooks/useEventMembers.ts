"use client";

import { useQuery } from "@tanstack/react-query";

import type { PublicUserDto } from "@/lib/api/types";
import { eventRepo } from "@/lib/repositories/eventRepo";
import { queryKeys } from "@/lib/queryKeys";

const STALE_TIME_MS = 1000 * 60 * 2;

/** Os membros do evento, em cache uma só vez para todos os ecrãs que os mostram (faixa do mural, wishlist). */
export function useEventMembers(eventId: string | null, initialMembers?: PublicUserDto[]) {
  return useQuery({
    queryKey: queryKeys.eventMembers(eventId),
    // Uma resposta que não seja lista conta como vazia, em vez de partir o ecrã.
    queryFn: () => eventRepo.getMembers(eventId ?? "").then((response) => (Array.isArray(response) ? response : [])),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    // Os dados iniciais vêm do servidor (render inicial) e evitam um primeiro pedido.
    initialData: initialMembers,
  });
}
