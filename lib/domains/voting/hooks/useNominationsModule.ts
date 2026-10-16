"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AwardCategoryDto, EventActiveContextDto, MyNominationStatusDto, NomineeDto } from "@/lib/api/types";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { useCategorySelection } from "./useCategorySelection";

const EMPTY_CATEGORIES: AwardCategoryDto[] = [];
const EMPTY_NOMINEES: NomineeDto[] = [];

const QUERY_OPTIONS = { placeholderData: keepPreviousData, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } as const;

function useNominationQueries(eventId: string | null, initialCategories?: AwardCategoryDto[]) {
  const queryEventId = eventId ?? "";
  const enabled = Boolean(eventId);

  const categoriesQuery = useQuery({
    ...QUERY_OPTIONS,
    queryKey: ["nominations", queryEventId, "categories"],
    enabled,
    queryFn: async () => {
      const result = await awardsRepo.getCategories(queryEventId);
      // Kind 1 categories are chosen from members, not through a nomination.
      return result.items.filter((category) => category.isActive && category.kind !== 1);
    },
    initialData: initialCategories,
  });

  const myStatusQuery = useQuery<MyNominationStatusDto>({
    ...QUERY_OPTIONS,
    queryKey: ["nominations", queryEventId, "my-status"],
    enabled,
    queryFn: () => awardsRepo.getMyNominationStatus(queryEventId),
  });

  const approvedQuery = useQuery({
    ...QUERY_OPTIONS,
    queryKey: ["nominations", queryEventId, "approved"],
    enabled,
    queryFn: () => awardsRepo.getApprovedNominees(queryEventId),
  });

  const queries = [categoriesQuery, myStatusQuery, approvedQuery];
  return {
    categories: categoriesQuery.data ?? EMPTY_CATEGORIES,
    myStatus: myStatusQuery.data ?? null,
    approvedNominees: approvedQuery.data ?? EMPTY_NOMINEES,
    isLoading: queries.some((query) => query.isLoading),
    error: queries.find((query) => query.error)?.error ?? null,
    refreshQueries: () => queries.forEach((query) => void query.refetch()),
  };
}

/**
 * Owns the remote nomination state and the category selection.
 * The view only receives the data and callbacks it needs to render.
 */
export function useNominationsModule(initialCategories?: AwardCategoryDto[], initialContext?: EventActiveContextDto | null) {
  const queryClient = useQueryClient();
  const { event, overview, isLoading: isOverviewLoading } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryEventId = eventId ?? "";
  const { categories, isLoading, ...remote } = useNominationQueries(eventId, initialCategories);
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
    ...remote,
    eventId,
    queryEventId,
    isPhaseOpen: overview?.activePhase?.type === "PROPOSALS",
    isLoading: isOverviewLoading || isLoading,
    categories,
    selectedCategory,
    setSelectedCategoryId,
    queryClient,
    updateNominationCaches,
  };
}
