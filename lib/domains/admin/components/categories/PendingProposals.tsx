"use client";

import { useState } from "react";

import { AdminSectionSummary } from "@/lib/domains/admin/components/layout/AdminSectionSummary";
import { AdminStateMessage } from "@/lib/domains/admin/components/layout/AdminStateMessage";
import { AdminStatusFilters } from "@/lib/domains/admin/components/layout/AdminStatusFilters";
import { ProposalShell } from "@/lib/domains/admin/components/categories/ProposalShell";
import type { CategoryProposalDto, MeasureProposalDto } from "@/lib/api/types";

import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_OPTIONS,
} from "../proposalConstants";
import type {
  PendingProposalCard,
  PendingProposalPanel,
  ProposalCounts,
  ProposalFilter,
  ProposalStatus,
  ProposalType,
  DeleteConfirmationRequest,
} from "../proposalTypes";
import { usePendingProposals } from "../hooks/usePendingProposals";
import { ProposalDeleteDialog } from "./ProposalDeleteDialog";
import { ProposalReviewCard } from "./ProposalReviewCard";

type PendingProposalsProps = {
  eventId: string | null;
  categoryProposals: CategoryProposalDto[];
  measureProposalsAll: MeasureProposalDto[];
  loading: boolean;
  onUpdate: () => Promise<void>;
};

const PANEL_META: Record<
  ProposalType,
  { description: string; emptyMessage: string; title: string }
> = {
  category: {
    description:
      "Revê, corrige e fecha propostas de categoria sem sair da fila de revisão.",
    emptyMessage: "Sem propostas de categoria neste estado.",
    title: "Categorias em revisão",
  },
  measure: {
    description:
      "Fecha medidas propostas com o mesmo fluxo de aprovação, rejeição e reabertura.",
    emptyMessage: "Sem medidas neste estado.",
    title: "Medidas em revisão",
  },
};

function renderProposalPanelState(
  loading: boolean,
  controlsDisabled: boolean,
  hasItems: boolean,
  emptyMessage: string,
) {
  if (loading)
    return <AdminStateMessage>A carregar propostas...</AdminStateMessage>;
  if (controlsDisabled) {
    return (
      <AdminStateMessage>
        Falta uma edição ativa para abrir a moderação.
      </AdminStateMessage>
    );
  }
  return hasItems ? null : (
    <AdminStateMessage variant="panel">{emptyMessage}</AdminStateMessage>
  );
}

export function PendingProposals({
  eventId,
  categoryProposals,
  measureProposalsAll,
  loading,
  onUpdate,
}: Readonly<PendingProposalsProps>) {
  const [deleteRequest, setDeleteRequest] =
    useState<DeleteConfirmationRequest | null>(null);

  const { state, actions } = usePendingProposals(
    eventId,
    categoryProposals,
    measureProposalsAll,
    onUpdate,
  );

  const {
    categoryFilter,
    measureFilter,
    categoryCounts,
    measureCounts,
    isBusy,
  } = state;

  const {
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
  } = actions;

  const controlsDisabled = !eventId;

  const requestDelete = ({
    id,
    title,
    type,
    onConfirm,
  }: DeleteConfirmationRequest) => {
    setDeleteRequest({ id, title, type, onConfirm });
  };

  const buildCategoryCard = (
    proposal: CategoryProposalDto,
  ): PendingProposalCard => {
    const draft = getCategoryDraft(proposal);

    return {
      deleteIcon: "trash",
      deleteLabel: "Apagar proposta",
      fields: [
        {
          disabled: isBusy,
          icon: "name",
          id: `${proposal.id}-name`,
          label: "Nome da categoria",
          onChange: (value) => setCategoryDraft(proposal, { name: value }),
          value: draft.name,
        },
        {
          disabled: isBusy,
          icon: "description",
          id: `${proposal.id}-description`,
          label: "Descrição",
          multiline: true,
          onChange: (value) =>
            setCategoryDraft(proposal, { description: value }),
          placeholder: "Contexto da proposta",
          value: draft.description,
        },
      ],
      id: proposal.id,
      isBusy,
      meta: new Date(proposal.createdAtUtc).toLocaleString("pt-PT"),
      onApprove:
        proposal.status !== "approved"
          ? () => handleCategoryStatusChange(proposal, "approved")
          : undefined,
      onDelete: () => {
        if (!eventId) return;

        requestDelete({
          id: proposal.id,
          title: proposal.name,
          type: "category",
          onConfirm: () => handleDeleteCategory(proposal),
        });
      },
      onReject:
        proposal.status !== "rejected"
          ? () => handleCategoryStatusChange(proposal, "rejected")
          : undefined,
      onReopen:
        proposal.status !== "pending"
          ? () => handleCategoryStatusChange(proposal, "pending")
          : undefined,
      onSave: () => handleSaveCategory(proposal),
      saveLabel: "Guardar",
      status: proposal.status as ProposalStatus,
      title: draft.name || proposal.name,
    };
  };

  const buildMeasureCard = (
    proposal: MeasureProposalDto,
  ): PendingProposalCard => {
    const draftText = getMeasureDraft(proposal);

    return {
      deleteIcon: "trash",
      deleteLabel: "Apagar proposta",
      fields: [
        {
          disabled: isBusy,
          icon: "measure",
          id: `${proposal.id}-text`,
          label: "Texto da medida",
          onChange: (value) => setMeasureDraft(proposal.id, value),
          placeholder: "Texto da proposta",
          value: draftText,
        },
      ],
      id: proposal.id,
      isBusy,
      meta: new Date(proposal.createdAtUtc).toLocaleString("pt-PT"),
      note: proposal.status,
      onApprove:
        proposal.status !== "approved"
          ? () => handleMeasureStatusChange(proposal, "approved")
          : undefined,
      onDelete: () => {
        if (!eventId) return;

        requestDelete({
          id: proposal.id,
          title: "Medida proposta",
          type: "measure",
          onConfirm: () => handleDeleteMeasure(proposal),
        });
      },
      onReject:
        proposal.status !== "rejected"
          ? () => handleMeasureStatusChange(proposal, "rejected")
          : undefined,
      onReopen:
        proposal.status !== "pending"
          ? () => handleMeasureStatusChange(proposal, "pending")
          : undefined,
      onSave: () => handleSaveMeasure(proposal),
      saveDisabled: !draftText.trim(),
      saveLabel: "Guardar texto",
      status: proposal.status as ProposalStatus,
      title: "Medida proposta",
    };
  };

  const buildPanel = <T extends { id: string; status: ProposalStatus }>(
    type: ProposalType,
    items: T[],
    filter: ProposalFilter,
    setFilter: (filter: ProposalFilter) => void,
    counts: ProposalCounts,
    buildCard: (item: T) => PendingProposalCard,
  ): PendingProposalPanel => ({
    counts,
    description: PANEL_META[type].description,
    emptyMessage: PANEL_META[type].emptyMessage,
    filter,
    items: (filter === "all"
      ? items
      : items.filter((item) => item.status === filter)
    ).map(buildCard),
    setFilter,
    subtitle: "Moderação",
    title: PANEL_META[type].title,
    totalCount: items.length,
    type,
  });

  const panels = [
    buildPanel(
      "category",
      categoryProposals,
      categoryFilter,
      setCategoryFilter,
      categoryCounts,
      buildCategoryCard,
    ),
    buildPanel(
      "measure",
      measureProposalsAll,
      measureFilter,
      setMeasureFilter,
      measureCounts,
      buildMeasureCard,
    ),
  ];

  const clearDeleteRequest = () => setDeleteRequest(null);

  return (
    <div className="space-y-4">
      <AdminSectionSummary
        kicker="Fila de moderação"
        title="Propostas por fechar"
        description="Categorias e medidas propostas pelo grupo à espera de decisão."
        items={[
          {
            label: "Categorias pendentes",
            value: categoryCounts.pending,
            tone: categoryCounts.pending > 0 ? "highlight" : "default",
          },
          {
            label: "Medidas pendentes",
            value: measureCounts.pending,
            tone: measureCounts.pending > 0 ? "highlight" : "default",
          },
          {
            label: "Categorias tratadas",
            value: categoryCounts.approved + categoryCounts.rejected,
            tone: "muted",
          },
          {
            label: "Medidas tratadas",
            value: measureCounts.approved + measureCounts.rejected,
            tone: "muted",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {panels.map((panel) => (
          <ProposalShell
            key={panel.type}
            title={`${panel.title} (${panel.totalCount})`}
            subtitle={panel.subtitle}
            description={panel.description}
          >
            <AdminStatusFilters
              active={panel.filter}
              counts={panel.counts}
              labels={PROPOSAL_STATUS_LABELS}
              onChange={panel.setFilter}
              options={PROPOSAL_STATUS_OPTIONS}
            />

            {renderProposalPanelState(
              loading && panel.items.length === 0,
              controlsDisabled,
              panel.items.length > 0,
              panel.emptyMessage,
            )}

            {!controlsDisabled && panel.items.length > 0 ? (
              <div
                className="border border-[var(--border-paper-soft)] rounded-md bg-[var(--bg-paper-soft)]"
              >
                <div className="space-y-2">
                  {panel.items.map((proposal) => (
                    <ProposalReviewCard key={proposal.id} proposal={proposal} />
                  ))}
                </div>
              </div>
            ) : null}
          </ProposalShell>
        ))}
      </div>

      <ProposalDeleteDialog
        request={deleteRequest}
        onClose={clearDeleteRequest}
      />
    </div>
  );
}
