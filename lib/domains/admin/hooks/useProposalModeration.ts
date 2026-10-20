import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";

export type ProposalKind = "category" | "measure";

/** Os campos editados de uma proposta: `name` e `description` nas categorias, `text` nas medidas. */
export type ProposalDraft = Record<string, string>;

type ProposalDecision = "approved" | "rejected";

const copy = messages.admin.useProposalModeration;

const DECISION_MESSAGES: Record<ProposalDecision, { success: string; error: string }> = {
  approved: copy.approved,
  rejected: copy.rejected,
};

type UpdateRequest = {
  kind: ProposalKind;
  id: string;
  draft: ProposalDraft;
  status?: ProposalDecision;
};

/** Envia a proposta editada (já aparada) para o endpoint da categoria ou da medida; `status` aprova ou rejeita. */
function updateProposal(eventId: string, { kind, id, draft, status }: UpdateRequest): Promise<unknown> {
  return kind === "category"
    ? adminRepo.updateCategoryProposal(eventId, id, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        status,
      })
    : adminRepo.updateMeasureProposal(eventId, id, { text: draft.text.trim(), status });
}

/** Guarda, aprova, rejeita e apaga propostas de categorias e de medidas. */
export function useProposalModeration(eventId: string, onUpdate: () => Promise<void>) {
  const updateMutation = useMutation({
    mutationFn: (request: UpdateRequest) => updateProposal(eventId, request),
    onSuccess: onUpdate,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: ProposalKind; id: string }) =>
      kind === "category"
        ? adminRepo.deleteCategoryProposal(eventId, id)
        : adminRepo.deleteMeasureProposal(eventId, id),
    onSuccess: onUpdate,
  });

  const handleSave = (request: UpdateRequest) => {
    // Sem `status` é só uma edição; com `status` o aviso é o da decisão.
    const toastMessages = request.status ? DECISION_MESSAGES[request.status] : copy.updated;

    updateMutation.mutate(request, {
      onSuccess: () => toast.success(toastMessages.success),
      onError: (error) => toast.error(getErrorMessage(error, toastMessages.error)),
    });
  };

  const handleDelete = (kind: ProposalKind, id: string) => {
    deleteMutation.mutate(
      { kind, id },
      {
        onSuccess: () => toast.success(copy.deleted.success),
        onError: (error) => toast.error(getErrorMessage(error, copy.deleted.error)),
      },
    );
  };

  return {
    handleSave,
    handleDelete,
    isBusy: updateMutation.isPending || deleteMutation.isPending,
  };
}
