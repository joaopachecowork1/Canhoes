import { useState } from "react";
import { toast } from "sonner";
import { useAdminMutation } from "./useAdminMutation";
import type { CategoryProposalDto, MeasureProposalDto } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { summarizeModerationStatuses } from "../moderationUtils";
import type { ProposalFilter, ProposalStatus } from "../proposalTypes";
type CategoryDraft = { description: string; name: string };

const getStatusMessages = (status: ProposalStatus) => {
  switch (status) {
    case "approved":
      return {
        error: "Não foi possível aprovar a proposta.",
        success: "Proposta aprovada",
      };
    case "rejected":
      return {
        error: "Não foi possível rejeitar a proposta.",
        success: "Proposta rejeitada",
      };
    default:
      return {
        error: "Não foi possível reabrir a proposta.",
        success: "Proposta reaberta",
      };
  }
};

export function usePendingProposals(
  eventId: string | null,
  categoryProposals: CategoryProposalDto[],
  measureProposalsAll: MeasureProposalDto[],
  onUpdate: () => Promise<void>
) {
  const [categoryFilter, setCategoryFilter] = useState<ProposalFilter>("pending");
  const [measureFilter, setMeasureFilter] = useState<ProposalFilter>("pending");
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraft>>({});
  const [measureDrafts, setMeasureDrafts] = useState<Record<string, string>>({});

  const categoryCounts = {
    all: categoryProposals.length,
    ...summarizeModerationStatuses(categoryProposals),
  };

  const measureCounts = {
    all: measureProposalsAll.length,
    ...summarizeModerationStatuses(measureProposalsAll),
  };

  const updateCategoryProposal = useAdminMutation({
    mutationFn: (data: {
      proposalId: string;
      patch: {
        name: string;
        description: string | null;
        status?: ProposalStatus;
      };
    }) =>
      adminRepo.updateCategoryProposal(
        eventId!,
        data.proposalId,
        data.patch
      ),
    onSuccess: onUpdate,
  });

  const deleteCategoryProposal = useAdminMutation({
    mutationFn: (proposalId: string) =>
      adminRepo.deleteCategoryProposal(eventId!, proposalId),
    onSuccess: onUpdate,
  });

  const updateMeasureProposal = useAdminMutation({
    mutationFn: (data: {
      proposalId: string;
      patch: { text?: string; status?: string };
    }) =>
      adminRepo.updateMeasureProposal(
        eventId!,
        data.proposalId,
        data.patch
      ),
    onSuccess: onUpdate,
  });

  const deleteMeasureProposal = useAdminMutation({
    mutationFn: (proposalId: string) =>
      adminRepo.deleteMeasureProposal(eventId!, proposalId),
    onSuccess: onUpdate,
  });

  const getCategoryDraft = (proposal: CategoryProposalDto): CategoryDraft => ({
    description:
      categoryDrafts[proposal.id]?.description ?? proposal.description ?? "",
    name: categoryDrafts[proposal.id]?.name ?? proposal.name,
  });

  const setCategoryDraft = (
    proposal: CategoryProposalDto,
    patch: Partial<CategoryDraft>
  ) => {
    setCategoryDrafts((previous) => ({
      ...previous,
      [proposal.id]: {
        description:
          previous[proposal.id]?.description ?? proposal.description ?? "",
        name: previous[proposal.id]?.name ?? proposal.name,
        ...patch,
      },
    }));
  };

  const getMeasureDraft = (proposal: MeasureProposalDto) =>
    measureDrafts[proposal.id] ?? proposal.text;

  const setMeasureDraft = (proposalId: string, text: string) => {
    setMeasureDrafts((previous) => ({ ...previous, [proposalId]: text }));
  };
  const getMeasureText = (proposal: MeasureProposalDto) =>
    getMeasureDraft(proposal).trim();

  const handleCategoryStatusChange = (
    proposal: CategoryProposalDto,
    newStatus: ProposalStatus
  ) => {
    const draft = getCategoryDraft(proposal);
    const name = draft.name.trim();

    if (!name) {
      toast.error("O nome da proposta é obrigatório");
      return;
    }

    const { success, error } = getStatusMessages(newStatus);
    updateCategoryProposal.mutate(
      {
        proposalId: proposal.id,
        patch: {
          name,
          description: draft.description.trim() || null,
          status: newStatus,
        },
      },
      { onSuccess: () => toast.success(success), onError: (e) => toast.error(getErrorMessage(e, error)) }
    );
  };

  const handleSaveCategory = (proposal: CategoryProposalDto) => {
    const draft = getCategoryDraft(proposal);
    const name = draft.name.trim();
    if (!name) return;

    updateCategoryProposal.mutate(
      {
        proposalId: proposal.id,
        patch: {
          name,
          description: draft.description.trim() || null,
        },
      },
      {
        onSuccess: () => toast.success("Proposta de categoria atualizada"),
        onError: (err) =>
          toast.error(
            getErrorMessage(
              err,
              "Não foi possível atualizar a proposta de categoria."
            )
          ),
      }
    );
  };

  const handleDeleteCategory = (proposal: CategoryProposalDto) => {
    deleteCategoryProposal.mutate(proposal.id, {
      onSuccess: () => toast.success("Proposta removida"),
      onError: (err) =>
        toast.error(
          getErrorMessage(
            err,
            "Não foi possível apagar a proposta de categoria."
          )
        ),
    });
  };

  const handleMeasureStatusChange = (
    proposal: MeasureProposalDto,
    status: ProposalStatus
  ) => {
    const { success, error } = getStatusMessages(status);
    const text = getMeasureText(proposal);

    updateMeasureProposal.mutate(
      { proposalId: proposal.id, patch: { text, status } },
      {
        onSuccess: () => toast.success(success),
        onError: (e) => toast.error(getErrorMessage(e, error)),
      }
    );
  };

  const handleSaveMeasure = (proposal: MeasureProposalDto) => {
    const text = getMeasureText(proposal);
    if (!text) return;

    updateMeasureProposal.mutate(
      { proposalId: proposal.id, patch: { text } },
      {
        onSuccess: () => toast.success("Proposta atualizada"),
        onError: (err) =>
          toast.error(getErrorMessage(err, "Não foi possível atualizar a proposta.")),
      }
    );
  };

  const handleDeleteMeasure = (proposal: MeasureProposalDto) => {
    deleteMeasureProposal.mutate(proposal.id, {
      onSuccess: () => toast.success("Proposta removida"),
      onError: (err) =>
        toast.error(getErrorMessage(err, "Não foi possível apagar a proposta.")),
    });
  };

  return {
    state: {
      categoryFilter,
      measureFilter,
      categoryDrafts,
      measureDrafts,
      categoryCounts,
      measureCounts,
      isBusy:
        updateCategoryProposal.isPending ||
        deleteCategoryProposal.isPending ||
        updateMeasureProposal.isPending ||
        deleteMeasureProposal.isPending,
    },
    actions: {
      setCategoryFilter,
      setMeasureFilter,
      getCategoryDraft,
      setCategoryDraft,
      getMeasureDraft,
      setMeasureDraft,
      handleCategoryStatusChange,
      handleSaveCategory,
      handleDeleteCategory,
      handleMeasureStatusChange,
      handleSaveMeasure,
      handleDeleteMeasure,
    },
  };
}
