"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AwardCategoryDto, EventActiveContextDto, MyNominationDto, NomineeDto } from "@/lib/api/types";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { useCategorySelection } from "./useCategorySelection";
import { queryKeys } from "@/lib/queryKeys";

const EMPTY_CATEGORIES: AwardCategoryDto[] = [];
const EMPTY_NOMINEES: NomineeDto[] = [];
const EMPTY_MY_NOMINATIONS: MyNominationDto[] = [];

/** Query key of the user's own nominations, shared with the optimistic update in `useSubmitNomination`. */
export const myNominationsKey = (eventId: string) => ["nominations", eventId, "my-status"];

const QUERY_OPTIONS = {
  placeholderData: keepPreviousData,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
} as const;

function useNominationQueries(eventId: string | null, initialCategories?: AwardCategoryDto[]) {
  const queryEventId = eventId ?? "";
  const enabled = Boolean(eventId);

  const categoriesQuery = useQuery({
    ...QUERY_OPTIONS,
    queryKey: queryKeys.nominationCategories(queryEventId),
    enabled,
    queryFn: async () => {
      const result = await awardsRepo.getCategories(queryEventId);
      // Kind 1 categories are chosen from members, not through a nomination.
      return result.items.filter((category) => category.isActive && category.kind !== 1);
    },
    initialData: initialCategories,
  });

  const myNominationsQuery = useQuery({
    ...QUERY_OPTIONS,
    queryKey: myNominationsKey(queryEventId),
    enabled,
    queryFn: () => awardsRepo.getMyNominations(queryEventId),
  });

  const approvedQuery = useQuery({
    ...QUERY_OPTIONS,
    queryKey: queryKeys.nominationsApproved(queryEventId),
    enabled,
    queryFn: () => awardsRepo.getApprovedNominees(queryEventId),
  });

  const queries = [categoriesQuery, myNominationsQuery, approvedQuery];
  return {
    categories: categoriesQuery.data ?? EMPTY_CATEGORIES,
    myNominations: myNominationsQuery.data ?? EMPTY_MY_NOMINATIONS,
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
export function useNominationsModule(
  initialCategories?: AwardCategoryDto[],
  initialContext?: EventActiveContextDto | null,
) {
  const queryClient = useQueryClient();
  const { event, overview, isLoading: isOverviewLoading } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryEventId = eventId ?? "";
  const { categories, isLoading, ...remote } = useNominationQueries(eventId, initialCategories);
  const { setSelectedId: setSelectedCategoryId, selectedItem: selectedCategory } = useCategorySelection(
    categories,
    (category) => category.id,
  );

  const refreshMyNominations = () => queryClient.invalidateQueries({ queryKey: myNominationsKey(queryEventId) });

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
    refreshMyNominations,
  };
}
