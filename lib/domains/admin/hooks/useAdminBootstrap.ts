"use client";

import { useQuery } from "@tanstack/react-query";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { queryKeys } from "@/lib/queryKeys";

/** Events, admin state and counters for the admin area, in one request. */
export function useAdminBootstrap(eventId: string | null, enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.bootstrap(eventId),
    queryFn: () => adminRepo.getBootstrap(eventId!),
    enabled: !!eventId && enabled,
    staleTime: 1000 * 30, // 30 seconds
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
