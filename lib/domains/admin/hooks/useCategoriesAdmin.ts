import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AdminNomineeDto,
  AdminVoteAuditRowDto,
  AwardCategoryDto,
  CreateAwardCategoryRequest,
  UpdateAwardCategoryRequest,
} from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";

import { useAdminMutation } from "./useAdminMutation";
import {
  buildCategoryForm,
  buildCategoryUsageById,
  buildCreateCategoryPayload,
  buildInitialCategoryForm,
  buildUpdateCategoryPayload,
  sortCategories,
  type CategoryFormState,
  type CategorySheetState,
} from "../components/categories/categoryTypes";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.admin.CategoriesAdmin;
const EMPTY_AWARD_CATEGORIES: AwardCategoryDto[] = [];
const EMPTY_ADMIN_VOTES: AdminVoteAuditRowDto[] = [];
const EMPTY_NOMINATIONS: AdminNomineeDto[] = [];
const QUERY_OPTIONS = { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 2 } as const;

/** Categories plus the nominees and votes that decide whether each one may be deleted. */
function useCategoryQueries(eventId: string | null) {
  const enabled = Boolean(eventId);
  const id = eventId ?? "";

  const categoriesQuery = useQuery({
    ...QUERY_OPTIONS,
    enabled,
    queryFn: () => adminRepo.getCategories(id),
    queryKey: queryKeys.admin.categories(eventId),
  });
  const nominationsSummaryQuery = useQuery({
    ...QUERY_OPTIONS,
    enabled,
    queryFn: () => adminRepo.getNominationsPaged(id, 0, 1000),
    queryKey: queryKeys.admin.nominationsAll(eventId),
  });
  const votesQuery = useQuery({
    ...QUERY_OPTIONS,
    enabled,
    queryFn: () => adminRepo.getVotesPaged(id, 0, 1000),
    queryKey: queryKeys.admin.votesAudit(eventId),
    select: (data) => data.votes,
  });

  const categories = categoriesQuery.data ?? EMPTY_AWARD_CATEGORIES;
  const nominations = nominationsSummaryQuery.data?.nominations ?? EMPTY_NOMINATIONS;
  const votes = votesQuery.data ?? EMPTY_ADMIN_VOTES;
  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);
  const categoryUsageById = useMemo(
    () => buildCategoryUsageById(sortedCategories, nominations, votes),
    [nominations, sortedCategories, votes],
  );
  const queries = [categoriesQuery, nominationsSummaryQuery, votesQuery];

  return {
    sortedCategories,
    categoryUsageById,
    isLoading: queries.some((query) => query.isLoading),
    queryError: queries.find((query) => query.error)?.error ?? null,
    refetchAll: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

function useCategoryMutations(eventId: string | null, onDone: () => Promise<void>) {
  const queryClient = useQueryClient();
  const id = eventId ?? "";
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories(eventId) });
    await onDone();
  };

  const create = useAdminMutation({
    mutationFn: (payload: CreateAwardCategoryRequest) => adminRepo.createCategory(id, payload),
    onSuccess: refresh,
    successMessage: copy.created,
  });
  const update = useAdminMutation({
    mutationFn: ({ categoryId, payload }: { categoryId: string; payload: UpdateAwardCategoryRequest }) =>
      adminRepo.updateCategory(id, categoryId, payload),
    onSuccess: refresh,
    successMessage: copy.updated,
  });
  const remove = useAdminMutation({
    mutationFn: (categoryId: string) => adminRepo.deleteCategory(id, categoryId),
    onSuccess: refresh,
    successMessage: copy.deleted,
  });

  return { create, update, delete: remove, isBusy: create.isPending || update.isPending || remove.isPending };
}

/**
 * Provides category data, mutation state and editor actions to the admin UI.
 * The pure DTO/form and deletion rules are kept in categoryTypes.
 */
export function useCategoriesAdmin(eventId: string | null, onUpdate: () => Promise<void>) {
  const [sheetState, setSheetState] = useState<CategorySheetState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AwardCategoryDto | null>(null);
  const [form, setForm] = useState<CategoryFormState>(() => buildInitialCategoryForm(1));
  const queries = useCategoryQueries(eventId);
  const mutations = useCategoryMutations(eventId, async () => {
    setDeleteTarget(null);
    setSheetState(null);
    await onUpdate();
  });

  const handleSave = () => {
    if (!eventId || !sheetState) return;
    if (sheetState.mode === "edit") {
      mutations.update.mutate({ categoryId: sheetState.category.id, payload: buildUpdateCategoryPayload(form) });
    } else {
      mutations.create.mutate(buildCreateCategoryPayload(form));
    }
  };

  return {
    ...queries,
    mutations,
    sheetState,
    deleteTarget,
    form,
    patchForm: (patch: Partial<CategoryFormState>) => setForm((current) => ({ ...current, ...patch })),
    openCreateSheet: () => {
      setForm(buildInitialCategoryForm(queries.sortedCategories.length + 1));
      setSheetState({ mode: "create" });
    },
    openEditSheet: (category: AwardCategoryDto) => {
      setForm(buildCategoryForm(category));
      setSheetState({ mode: "edit", category });
    },
    handleSheetOpenChange: (open: boolean) => {
      if (!open) setSheetState(null);
    },
    handleSave,
    setDeleteTarget,
    handleDelete: () => {
      if (deleteTarget) mutations.delete.mutate(deleteTarget.id);
    },
  };
}
