"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AwardCategoryDto, EventActiveContextDto, MyNominationStatusDto, NomineeDto } from "@/lib/api/types";
import { useEventOverview } from "@/hooks/useEventOverview";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { useCategorySelection } from "./useCategorySelection";

const EMPTY_CATEGORIES: AwardCategoryDto[] = [];
const EMPTY_NOMINEES: NomineeDto[] = [];

/**
 * Owns the remote nomination state and the category selection.
 * The view only receives the data and callbacks it needs to render.
 */
export function useNominationsModule(initialCategories?: AwardCategoryDto[], initialContext?: EventActiveContextDto | null) {
  const queryClient = useQueryClient();
  const { event, overview, isLoading: isOverviewLoading } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryEventId = eventId ?? "";

  const categoriesQuery = useQuery({
    queryKey: ["nominations", queryEventId, "categories"],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const result = await awardsRepo.getCategories(queryEventId);
      // Kind 1 categories are chosen from members, not through a nomination.
      return result.items.filter((category) => category.isActive && category.kind !== 1);
    },
    initialData: initialCategories,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const myStatusQuery = useQuery<MyNominationStatusDto>({
    queryKey: ["nominations", queryEventId, "my-status"],
    enabled: Boolean(eventId),
    queryFn: () => awardsRepo.getMyNominationStatus(queryEventId),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const approvedQuery = useQuery({
    queryKey: ["nominations", queryEventId, "approved"],
    enabled: Boolean(eventId),
    queryFn: () => awardsRepo.getApprovedNominees(queryEventId),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const { setSelectedId: setSelectedCategoryId, selectedItem: selectedCategory } =
    useCategorySelection(categories, (category) => category.id);

  const updateNominationCaches = () => {
    queryClient.setQueryData<MyNominationStatusDto | null>(["nominations", queryEventId, "my-status"], (current) =>
      current && selectedCategory ? { ...current, hasNomination: true, nomineeId: selectedCategory.id } : current
    );
    queryClient.setQueryData<NomineeDto[]>(["nominations", queryEventId, "approved"], (current) => current ?? []);
    return Promise.resolve();
  };

  return {
    eventId,
    queryEventId,
    isPhaseOpen: overview?.activePhase?.type === "PROPOSALS",
    isLoading: isOverviewLoading || categoriesQuery.isLoading || myStatusQuery.isLoading || approvedQuery.isLoading,
    error: categoriesQuery.error ?? myStatusQuery.error ?? approvedQuery.error,
    categories,
    myStatus: myStatusQuery.data ?? null,
    approvedNominees: approvedQuery.data ?? EMPTY_NOMINEES,
    selectedCategory,
    setSelectedCategoryId,
    queryClient,
    refreshQueries: () => {
      void categoriesQuery.refetch();
      void myStatusQuery.refetch();
      void approvedQuery.refetch();
    },
    updateNominationCaches,
  };
}
