"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { AdminNomineeDto } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";
import { adminRepo } from "@/lib/repositories/adminRepo";

const NOMINATIONS_PAGE_SIZE = 50;
const NOMINATIONS_PAGE = 0;

function getCategoriesQueryKey(eventId: string) {
  return ["canhoes", "admin", "categories", eventId] as const;
}

function getNominationsQueryKey(eventId: string) {
  return [
    "canhoes",
    "admin",
    "nominations",
    eventId,
    NOMINATIONS_PAGE,
    NOMINATIONS_PAGE_SIZE,
    "pending",
  ] as const;
}

function getPendingSummaryQueryKey(eventId: string) {
  return ["canhoes", "admin", "nominations", "summary", "pending", eventId] as const;
}

type NominationsQueryData = { nominations: AdminNomineeDto[] };

export function useAdminNominations(eventId: string | null) {
  const queryClient = useQueryClient();
  const queryEventId = eventId ?? "";
  const categoriesQueryKey = getCategoriesQueryKey(queryEventId);
  const nominationsQueryKey = getNominationsQueryKey(queryEventId);

  const categoriesQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getCategories(queryEventId),
    queryKey: categoriesQueryKey,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const nominationsQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getNominationsPaged(queryEventId, NOMINATIONS_PAGE, NOMINATIONS_PAGE_SIZE, "pending"),
    queryKey: nominationsQueryKey,
    refetchInterval: (query) => {
      const nominations = query.state.data?.nominations;
      if (!nominations?.length) return false;
      return nominations.some((nomination) => nomination.status === "pending") ? 30_000 : false;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const updateCachedNomination = (
    nomineeId: string,
    updateNomination: (nomination: AdminNomineeDto) => AdminNomineeDto
  ) => {
    queryClient.setQueryData<NominationsQueryData>(nominationsQueryKey, (current) =>
      current
        ? {
            ...current,
            nominations: current.nominations.map((nomination) =>
              nomination.id === nomineeId ? updateNomination(nomination) : nomination
            ),
          }
        : current
    );
  };

  const removeNominationFromCache = (nomineeId: string) => {
    queryClient.setQueryData<NominationsQueryData>(nominationsQueryKey, (current) =>
      current
        ? {
            ...current,
            nominations: current.nominations.filter((nomination) => nomination.id !== nomineeId),
          }
        : current
    );
  };

  const invalidateRelatedQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getPendingSummaryQueryKey(queryEventId) }),
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
    ]);
  };

  const approveNomination = useMutation({
    mutationFn: (nomineeId: string) => adminRepo.approveNomination(queryEventId, nomineeId),
    onSuccess: async (_data, nomineeId) => {
      updateCachedNomination(nomineeId, (nomination) => ({ ...nomination, status: "approved" }));
      toast.success("Nomeação aprovada.");
      await invalidateRelatedQueries();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível aprovar a nomeação."));
    },
  });

  const rejectNomination = useMutation({
    mutationFn: (nomineeId: string) => adminRepo.rejectNomination(queryEventId, nomineeId),
    onSuccess: async (_data, nomineeId) => {
      removeNominationFromCache(nomineeId);
      toast.success("Nomeação rejeitada.");
      await invalidateRelatedQueries();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível rejeitar a nomeação."));
    },
  });

  const setNominationCategory = useMutation({
    mutationFn: ({ nomineeId, categoryId }: { nomineeId: string; categoryId: string }) =>
      adminRepo.setNominationCategory(queryEventId, nomineeId, {
        categoryId: categoryId === "none" ? null : categoryId,
      }),
    onSuccess: async (_data, variables) => {
      updateCachedNomination(variables.nomineeId, (nomination) => ({
        ...nomination,
        categoryId: variables.categoryId === "none" ? null : variables.categoryId,
      }));
      toast.success("Categoria atualizada.");
      await invalidateRelatedQueries();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível mover a nomeação."));
    },
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey, exact: true }),
      queryClient.invalidateQueries({ queryKey: nominationsQueryKey, exact: true }),
    ]);
  };

  const approveNominationById = (nomineeId: string) => {
    approveNomination.mutate(nomineeId);
  };

  const rejectNominationById = (
    nomineeId: string,
    options?: { onSuccess?: () => void }
  ) => {
    rejectNomination.mutate(nomineeId, { onSuccess: options?.onSuccess });
  };

  return {
    categories: categoriesQuery.data ?? [],
    nominations: useMemo(() => nominationsQuery.data?.nominations ?? [], [nominationsQuery.data]),
    error: nominationsQuery.error ?? categoriesQuery.error,
    isLoading: categoriesQuery.isLoading || nominationsQuery.isLoading,
    isMutationPending:
      approveNomination.isPending ||
      rejectNomination.isPending ||
      setNominationCategory.isPending,
    approveNomination: approveNominationById,
    rejectNomination: rejectNominationById,
    setNominationCategory: setNominationCategory.mutate,
    refresh,
  };
}
