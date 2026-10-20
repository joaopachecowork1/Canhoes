"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EventActiveContextDto } from "@/lib/api/types";
import { eventRepo } from "@/lib/repositories/eventRepo";
import { queryKeys } from "@/lib/queryKeys";

/** O evento ativo e o resumo do utilizador sobre ele, partilhados pelo shell e por todas as páginas. */
export function useEventOverview(initialContext?: EventActiveContextDto | null) {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.eventOverview,
    queryFn: () => eventRepo.getActiveContext(),
    // O contexto vem do servidor no primeiro render, por isso a navegação não pisca vazia.
    initialData: initialContext ?? undefined,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Normaliza o erro para `Error`, que é o que a UI espera.
  let resolvedError: Error | null = null;
  if (error instanceof Error) {
    resolvedError = error;
  } else if (error) {
    resolvedError = new Error(String(error));
  }

  return {
    error: resolvedError,
    event: data?.event ?? null,
    isLoading,
    isFetching,
    overview: data?.overview ?? null,
    refresh,
  };
}
