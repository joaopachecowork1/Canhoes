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
import { useAdminMutation } from "./useAdminMutation";
import {
  buildCategoryForm,
  buildCategoryUsage,
  buildCreateCategoryPayload,
  buildInitialCategoryForm,
  buildUpdateCategoryPayload,
  type CategoryFormState,
  type CategorySheetState,
  type CategoryUsage,
} from "../categories/categoryTypes";

const EMPTY_AWARD_CATEGORIES: AwardCategoryDto[] = [];
const EMPTY_ADMIN_VOTES: AdminVoteAuditRowDto[] = [];
const EMPTY_NOMINATIONS: AdminNomineeDto[] = [];

/**
 * Provides category data, mutation state and editor actions to the admin UI.
 * The pure DTO/form and deletion rules are kept in categoryTypes.
 */
export function useCategoriesAdmin(eventId: string | null, onUpdate: () => Promise<void>) {
  const queryClient = useQueryClient();
  const [sheetState, setSheetState] = useState<CategorySheetState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AwardCategoryDto | null>(
    null
  );
  const [form, setForm] = useState<CategoryFormState>(() =>
    buildInitialCategoryForm(1)
  );

  const categoriesQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getCategories(eventId!),
    queryKey: ["canhoes", "admin", "categories", eventId],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const nominationsSummaryQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getNominationsPaged(eventId!, 0, 1000),
    queryKey: ["canhoes", "admin", "nominations", "summary", eventId],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const votesQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getVotesPaged(eventId!, 0, 1000),
    queryKey: ["canhoes", "admin", "votes", "audit", eventId],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
    select: (data) => data.votes,
  });

  const categories = categoriesQuery.data ?? EMPTY_AWARD_CATEGORIES;
  const nominations = nominationsSummaryQuery.data?.nominations ?? EMPTY_NOMINATIONS;
  const votes = votesQuery.data ?? EMPTY_ADMIN_VOTES;

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (left, right) =>
          (left.sortOrder ?? 0) -
            (right.sortOrder ?? 0) || left.name.localeCompare(right.name, "pt-PT")
      ),
    [categories]
  );

  const categoryUsageById = useMemo(() => {
    const noms = nominations;
    const vts = votes;
    const nomineeCounts = noms.reduce<Record<string, number>>(
      (acc, nominee) => {
        if (!nominee.categoryId) return acc;
        acc[nominee.categoryId] = (acc[nominee.categoryId] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const voteCounts = vts.reduce<Record<string, number>>((acc, vote) => {
      acc[vote.categoryId] = (acc[vote.categoryId] ?? 0) + 1;
      return acc;
    }, {});

    return Object.fromEntries(
      sortedCategories.map((category) => [
        category.id,
        buildCategoryUsage(
          category,
          nomineeCounts[category.id] ?? 0,
          voteCounts[category.id] ?? 0
        ),
      ])
    ) as Record<string, CategoryUsage>;
  }, [nominations, sortedCategories, votes]);

  const createCategory = useAdminMutation({
    mutationFn: (payload: CreateAwardCategoryRequest) =>
      adminRepo.createCategory(eventId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "categories", eventId] });
      setSheetState(null);
      await onUpdate();
    },
    successMessage: "Categoria criada.",
  });

  const updateCategory = useAdminMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: UpdateAwardCategoryRequest;
    }) => adminRepo.updateCategory(eventId!, categoryId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "categories", eventId] });
      setSheetState(null);
      await onUpdate();
    },
    successMessage: "Categoria atualizada.",
  });

  const deleteCategory = useAdminMutation({
    mutationFn: (categoryId: string) =>
      adminRepo.deleteCategory(eventId!, categoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "categories", eventId] });
      setDeleteTarget(null);
      setSheetState(null);
      await onUpdate();
    },
    successMessage: "Categoria apagada.",
  });

  const patchForm = (patch: Partial<CategoryFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const openCreateSheet = () => {
    setForm(buildInitialCategoryForm(sortedCategories.length + 1));
    setSheetState({ mode: "create" });
  };

  const openEditSheet = (category: AwardCategoryDto) => {
    setForm(buildCategoryForm(category));
    setSheetState({ mode: "edit", category });
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setSheetState(null);
    }
  };

  const handleSave = () => {
    if (!eventId || !sheetState) return;

    if (sheetState.mode === "edit") {
      updateCategory.mutate({
        categoryId: sheetState.category.id,
        payload: buildUpdateCategoryPayload(form),
      });
    } else {
      createCategory.mutate(buildCreateCategoryPayload(form));
    }
  };
  
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCategory.mutate(deleteTarget.id);
  };


  return {
    queries: {
      categories: categoriesQuery,
      nominationsSummary: nominationsSummaryQuery,
      votes: votesQuery,
    },
    mutations: {
      create: createCategory,
      update: updateCategory,
      delete: deleteCategory,
    },
    state: {
      sortedCategories,
      categoryUsageById,
      sheetState,
      deleteTarget,
      form,
      isLoading: categoriesQuery.isLoading || nominationsSummaryQuery.isLoading || votesQuery.isLoading,
      isBusy: createCategory.isPending || updateCategory.isPending || deleteCategory.isPending,
      queryError: categoriesQuery.error || nominationsSummaryQuery.error || votesQuery.error,
    },
    actions: {
      patchForm,
      openCreateSheet,
      openEditSheet,
      handleSheetOpenChange,
      handleSave,
      setDeleteTarget,
      handleDelete,
    },
  };
}
