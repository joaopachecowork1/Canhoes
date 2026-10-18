"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { AdminNomineeDto } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";

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

const copy = messages.admin.useAdminNominations;
const NO_CATEGORY = "none";

/** A moderation write: updates the pending list in place, toasts, then refreshes the counters. */
function useModerationMutation<TVariables>({
  errorMessage,
  mutationFn,
  successMessage,
  updateCache,
  invalidateRelated,
}: Readonly<{
  errorMessage: string;
  mutationFn: (variables: TVariables) => Promise<unknown>;
  successMessage: string;
  updateCache: (variables: TVariables) => void;
  invalidateRelated: () => Promise<unknown>;
}>) {
  return useMutation({
    mutationFn,
    onSuccess: async (_data, variables) => {
      updateCache(variables);
      toast.success(successMessage);
      await invalidateRelated();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, errorMessage));
    },
  });
}

function useNominationCache(nominationsQueryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  const updateNominations = (update: (nominations: AdminNomineeDto[]) => AdminNomineeDto[]) => {
    queryClient.setQueryData<NominationsQueryData>(nominationsQueryKey, (current) =>
      current ? { ...current, nominations: update(current.nominations) } : current
    );
  };

  return {
    remove: (nomineeId: string) => updateNominations((nominations) => nominations.filter((nomination) => nomination.id !== nomineeId)),
    setCategory: (nomineeId: string, categoryId: string | null) =>
      updateNominations((nominations) =>
        nominations.map((nomination) => (nomination.id === nomineeId ? { ...nomination, categoryId } : nomination))
      ),
  };
}

function useNominationMutations(queryEventId: string, nominationsQueryKey: readonly unknown[], categoriesQueryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const cache = useNominationCache(nominationsQueryKey);
  const invalidateRelated = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getPendingSummaryQueryKey(queryEventId) }),
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
    ]);

  const approve = useModerationMutation({
    mutationFn: (nomineeId: string) => adminRepo.approveNomination(queryEventId, nomineeId),
    updateCache: cache.remove,
    successMessage: copy.approved,
    errorMessage: copy.approveError,
    invalidateRelated,
  });
  const reject = useModerationMutation({
    mutationFn: (nomineeId: string) => adminRepo.rejectNomination(queryEventId, nomineeId),
    updateCache: cache.remove,
    successMessage: copy.rejected,
    errorMessage: copy.rejectError,
    invalidateRelated,
  });
  const setCategory = useModerationMutation({
    mutationFn: ({ nomineeId, categoryId }: { nomineeId: string; categoryId: string }) =>
      adminRepo.setNominationCategory(queryEventId, nomineeId, { categoryId: categoryId === NO_CATEGORY ? null : categoryId }),
    updateCache: ({ nomineeId, categoryId }) => cache.setCategory(nomineeId, categoryId === NO_CATEGORY ? null : categoryId),
    successMessage: copy.categoryUpdated,
    errorMessage: copy.moveError,
    invalidateRelated,
  });

  return { approve, reject, setCategory, isPending: approve.isPending || reject.isPending || setCategory.isPending };
}

/** Pending nominations and categories for the moderation queue, with approve, reject and move-to-category mutations. */
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
    refetchInterval: (query) => (query.state.data?.nominations.length ? 30_000 : false),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const mutations = useNominationMutations(queryEventId, nominationsQueryKey, categoriesQueryKey);

  return {
    categories: categoriesQuery.data ?? [],
    nominations: useMemo(() => nominationsQuery.data?.nominations ?? [], [nominationsQuery.data]),
    error: nominationsQuery.error ?? categoriesQuery.error,
    isLoading: categoriesQuery.isLoading || nominationsQuery.isLoading,
    isMutationPending: mutations.isPending,
    approveNomination: (nomineeId: string) => mutations.approve.mutate(nomineeId),
    rejectNomination: (nomineeId: string, options?: { onSuccess?: () => void }) =>
      mutations.reject.mutate(nomineeId, { onSuccess: options?.onSuccess }),
    setNominationCategory: mutations.setCategory.mutate,
    refresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: nominationsQueryKey, exact: true }),
      ]).then(() => undefined),
  };
}
