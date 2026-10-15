"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminRepo } from "@/lib/repositories/adminRepo";

/** Pending category and measure proposals, for the admin counters (the review queue has its own hook). */
export function usePendingProposals(eventId: string | null) {
  const categoryProposalsQuery = useQuery({
    queryKey: ["admin", "proposals", "categories", "pending", eventId],
    queryFn: () => adminRepo.getCategoryProposals(eventId!, "pending"),
    enabled: !!eventId,
    staleTime: 1000 * 60, // 1 minute
  });

  const measureProposalsQuery = useQuery({
    queryKey: ["admin", "proposals", "measures", "pending", eventId],
    queryFn: () => adminRepo.getMeasureProposals(eventId!, "pending"),
    enabled: !!eventId,
    staleTime: 1000 * 60, // 1 minute
  });

  const pendingCount = useMemo(() => {
    return (
      (categoryProposalsQuery.data?.total ?? 0) +
      (measureProposalsQuery.data?.total ?? 0)
    );
  }, [categoryProposalsQuery.data, measureProposalsQuery.data]);

  return {
    pendingCount,
    categoryProposals: categoryProposalsQuery.data?.items ?? [],
    measureProposals: measureProposalsQuery.data?.items ?? [],
    isLoading: categoryProposalsQuery.isLoading || measureProposalsQuery.isLoading,
    loading: categoryProposalsQuery.isLoading || measureProposalsQuery.isLoading,
    isError: categoryProposalsQuery.isError || measureProposalsQuery.isError,
    refetch: () => {
      void categoryProposalsQuery.refetch();
      void measureProposalsQuery.refetch();
    },
  };
}
