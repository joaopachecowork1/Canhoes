"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AwardCategoryDto, EventActiveContextDto, MyNominationDto, NomineeDto } from "@/lib/api/types";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { canNominate } from "@/lib/categoryKind";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { useCategorySelection } from "./useCategorySelection";
import { queryKeys } from "@/lib/queryKeys";

const EMPTY_CATEGORIES: AwardCategoryDto[] = [];
const EMPTY_NOMINEES: NomineeDto[] = [];
const EMPTY_MY_NOMINATIONS: MyNominationDto[] = [];

// `keepPreviousData` evita piscar vazio ao mudar de evento.
const QUERY_OPTIONS = {
  placeholderData: keepPreviousData,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
} as const;

/** As três queries do ecrã de nomeações: categorias, as minhas nomeações e os nomeados aprovados. */
function useNominationQueries(eventId: string | null, initialCategories?: AwardCategoryDto[]) {
  const queryEventId = eventId ?? "";
  const enabled = Boolean(eventId);

  const categoriesQuery = useQuery({
    ...QUERY_OPTIONS,
    queryKey: queryKeys.nominationCategories(queryEventId),
    enabled,
    queryFn: async () => (await awardsRepo.getCategories(queryEventId)).items,
    // No `select`, para valer também para os dados iniciais do servidor: só entram as categorias com nomeações.
    select: (categories) => categories.filter((category) => category.isActive && canNominate(category.kind)),
    // Os dados iniciais vêm do servidor e evitam um primeiro pedido.
    initialData: initialCategories,
  });

  const myNominationsQuery = useQuery({
    ...QUERY_OPTIONS,
    queryKey: queryKeys.nominationsMine(queryEventId),
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
 * Dono do estado remoto das nomeações e da categoria selecionada.
 * A vista só recebe os dados e os callbacks de que precisa para desenhar.
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

  const refreshMyNominations = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.nominationsMine(queryEventId) });

  return {
    ...remote,
    eventId,
    queryEventId,
    // Quem pode nomear decide-o o servidor (fase de propostas e nomeações visíveis; os admins passam sempre).
    isPhaseOpen: Boolean(overview?.permissions.canSubmitProposal),
    isLoading: isOverviewLoading || isLoading,
    categories,
    selectedCategory,
    setSelectedCategoryId,
    queryClient,
    refreshMyNominations,
  };
}
