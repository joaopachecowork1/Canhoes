"use client";

import { useQuery } from "@tanstack/react-query";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { queryKeys } from "@/lib/queryKeys";

/** Pending category and measure proposals for the admin review queue and its counters. */
export function useAdminProposals(eventId: string | null) {
  const categoryProposalsQuery = useQuery({
    queryKey: queryKeys.admin.categoryProposals(eventId),
    queryFn: () => adminRepo.getCategoryProposals(eventId!, "pending"),
    enabled: !!eventId,
    staleTime: 1000 * 60,
  });

  const measureProposalsQuery = useQuery({
    queryKey: queryKeys.admin.measureProposals(eventId),
    queryFn: () => adminRepo.getMeasureProposals(eventId!, "pending"),
    enabled: !!eventId,
    staleTime: 1000 * 60,
  });

  return {
    categoryProposals: categoryProposalsQuery.data?.items ?? [],
    measureProposals: measureProposalsQuery.data?.items ?? [],
    isLoading: categoryProposalsQuery.isLoading || measureProposalsQuery.isLoading,
  };
}
