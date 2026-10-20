"use client";

import { useQuery } from "@tanstack/react-query";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { queryKeys } from "@/lib/queryKeys";

/** Eventos, estado de admin e contadores da área de admin, num único pedido. */
export function useAdminBootstrap(eventId: string | null, enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.bootstrap(eventId),
    queryFn: () => adminRepo.getBootstrap(eventId!),
    enabled: !!eventId && enabled,
    staleTime: 1000 * 30, // 30 segundos
  });

  return {
    events: data?.events ?? [],
    state: data?.state ?? null,
    summary: data?.counts ?? null,
    loading: isLoading,
    error,
    refetch,
  };
}
