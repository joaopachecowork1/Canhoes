"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState, type ReactNode } from "react";
import { FilePenLine, Gavel, ScrollText, Trash2 } from "lucide-react";

import { AdminReviewCard } from "@/lib/domains/admin/components/layout/AdminReviewCard";
import { AdminSectionSummary } from "@/lib/domains/admin/components/layout/AdminSectionSummary";
import { AdminStateMessage } from "@/lib/domains/admin/components/layout/AdminStateMessage";
import { AdminStatusFilters } from "@/lib/domains/admin/components/layout/AdminStatusFilters";
import { ProposalShell } from "@/lib/domains/admin/components/categories/ProposalShell";
import { AdminDrawer } from "@/lib/domains/admin/components/layout/AdminDrawer";
import { statusBadgeVariant } from "@/lib/domains/admin/components/moderationUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import type {
  CategoryProposalDto,
  MeasureProposalDto,
} from "@/lib/api/types";

import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_OPTIONS } from "../proposalConstants";
import type {
  PendingProposalCard,
  PendingProposalPanel,
  ProposalCounts,
  ProposalFilter,
  ProposalStatus,
  ProposalType,
  DeleteConfirmationRequest,
} from "../proposalTypes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "../adminContentUi";
import { usePendingProposals } from "../hooks/usePendingProposals";



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
  emptyMessage: string
) {
  if (loading) return <AdminStateMessage>A carregar propostas...</AdminStateMessage>;
  if (controlsDisabled) {
    return (
      <AdminStateMessage>
        Falta uma edição ativa para abrir a moderação.
      </AdminStateMessage>
    );
  }
  return hasItems ? null : <AdminStateMessage variant="panel">{emptyMessage}</AdminStateMessage>;
}

function ProposalFieldInput({ field }: Readonly<{ field: { disabled?: boolean; icon: "description" | "measure" | "name"; id: string; label: string; multiline?: boolean; onChange: (value: string) => void; placeholder?: string; value: string } }>) {
  const icon = field.icon === "name" ? (
    <FilePenLine className="h-3.5 w-3.5" />
  ) : (
    <ScrollText className="h-3.5 w-3.5" />
  );

  return (
    <div className="space-y-2">
      <label htmlFor={field.id} className="editorial-kicker flex items-center gap-2">{icon}{field.label}</label>
      {field.multiline ? (
        <Textarea id={field.id} value={field.value} onChange={(event) => field.onChange(event.target.value)} disabled={field.disabled} placeholder={field.placeholder} rows={3} />
      ) : (
        <Input id={field.id} value={field.value} onChange={(event) => field.onChange(event.target.value)} disabled={field.disabled} placeholder={field.placeholder} />
      )}
    </div>
  );
}

type ProposalCardActionsProps = {
  deleteIcon?: ReactNode;
  deleteLabel?: string;
  isBusy: boolean;
  onApprove?: () => void;
  onDelete: () => void;
  onReject?: () => void;
  onReopen?: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel: string;
};

function ProposalCardActions({
  deleteIcon,
  deleteLabel = "Apagar",
  isBusy,
  onApprove,
  onDelete,
  onReject,
  onReopen,
  onSave,
  saveDisabled = false,
  saveLabel,
}: Readonly<ProposalCardActionsProps>) {
  const actions: Array<{
    key: string;
    label: string;
    onClick: () => void;
    variant?: "destructive" | "outline";
  }> = [];

  if (onApprove) actions.push({ key: "approve", label: "Aprovar", onClick: onApprove });
  if (onReject) {
    actions.push({
      key: "reject",
      label: "Rejeitar",
      onClick: onReject,
      variant: "destructive",
    });
  }
  if (onReopen) {
    actions.push({
      key: "reopen",
      label: "Reabrir",
      onClick: onReopen,
      variant: "outline",
    });
  }

  return (
    <>
      <Button variant="outline" disabled={isBusy || saveDisabled} onClick={onSave} className={`${ADMIN_OUTLINE_BUTTON_CLASS} w-full sm:w-auto`}>
        {saveLabel}
      </Button>
      {actions.map((action) => (
        <Button key={action.key} variant={action.variant} disabled={isBusy} onClick={action.onClick} aria-label={`${action.label} proposta`} className={`${action.variant === "outline" ? ADMIN_OUTLINE_BUTTON_CLASS : ""} w-full sm:w-auto`}>
          {action.label}
        </Button>
      ))}
      <Button variant="outline" disabled={isBusy} className={`${ADMIN_OUTLINE_BUTTON_CLASS} ${deleteIcon ? "w-full gap-2 sm:w-auto" : "w-full sm:w-auto"}`} onClick={onDelete}>
        {deleteIcon}
        {deleteLabel}
      </Button>
    </>
  );
}

function ProposalReviewCard({ proposal }: Readonly<{ proposal: PendingProposalCard }>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-3 border-b border-[var(--border-paper-soft)] hover:bg-[var(--bg-paper-soft)] transition-colors text-left"
      >
        <div className="flex flex-col min-w-0 pr-4">
          <p className="text-sm font-medium text-[var(--ink-primary)] truncate">
            {proposal.title}
          </p>
          <p className="text-[10px] text-[var(--ink-muted)]">
            {proposal.meta}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(proposal.status)} className="shrink-0 text-[10px]">
          {proposal.status}
        </Badge>
      </button>

      <AdminDrawer
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Detalhes da Proposta"
        description="Revê e fecha a proposta"
      >
        <AdminReviewCard
          title={proposal.title}
          meta={proposal.meta}
          status={
            <Badge variant={statusBadgeVariant(proposal.status)}>{proposal.status}</Badge>
          }
          actions={
            <ProposalCardActions
              isBusy={proposal.isBusy}
              onSave={() => {
                proposal.onSave();
                setIsOpen(false);
              }}
              saveLabel={proposal.saveLabel}
              saveDisabled={proposal.saveDisabled}
              onApprove={proposal.onApprove ? () => { proposal.onApprove!(); setIsOpen(false); } : undefined}
              onReject={proposal.onReject ? () => { proposal.onReject!(); setIsOpen(false); } : undefined}
              onReopen={proposal.onReopen ? () => { proposal.onReopen!(); setIsOpen(false); } : undefined}
              onDelete={() => {
                proposal.onDelete();
                setIsOpen(false);
              }}
              deleteLabel={proposal.deleteLabel}
              deleteIcon={
                proposal.deleteIcon === "trash" ? <Trash2 className="h-4 w-4" /> : undefined
              }
            />
          }
        >
          {proposal.note ? (
            <div className="flex items-center gap-2 text-[var(--ink-primary)]">
              <Gavel className="h-4 w-4" />
              <span className="editorial-kicker">
                {PROPOSAL_STATUS_LABELS[proposal.note as keyof typeof PROPOSAL_STATUS_LABELS] ?? proposal.note}
              </span>
            </div>
          ) : null}

          {proposal.fields.map((field) => (
            <ProposalFieldInput key={field.id} field={field} />
          ))}
        </AdminReviewCard>
      </AdminDrawer>
    </>
  );
}

export function PendingProposals({
  eventId,
  categoryProposals,
  measureProposalsAll,
  loading,
    onUpdate,
}: Readonly<PendingProposalsProps>) {
  const [listRef] = useAutoAnimate();
  const [deleteRequest, setDeleteRequest] = useState<DeleteConfirmationRequest | null>(null);

  const {
    state,
    actions,
  } = usePendingProposals(eventId, categoryProposals, measureProposalsAll, onUpdate);

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

  const buildCategoryCard = (proposal: CategoryProposalDto): PendingProposalCard => {
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
          onChange: (value) => setCategoryDraft(proposal, { description: value }),
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


  const buildMeasureCard = (proposal: MeasureProposalDto): PendingProposalCard => {
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
        proposal.status !== "approved" ? () => handleMeasureStatusChange(proposal, "approved") : undefined,
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
        proposal.status !== "rejected" ? () => handleMeasureStatusChange(proposal, "rejected") : undefined,
      onReopen:
        proposal.status !== "pending" ? () => handleMeasureStatusChange(proposal, "pending") : undefined,
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
    buildCard: (item: T) => PendingProposalCard
  ): PendingProposalPanel => ({
    counts,
    description: PANEL_META[type].description,
    emptyMessage: PANEL_META[type].emptyMessage,
    filter,
    items: (filter === "all" ? items : items.filter((item) => item.status === filter)).map(
      buildCard
    ),
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
      buildCategoryCard
    ),
    buildPanel(
      "measure",
      measureProposalsAll,
      measureFilter,
      setMeasureFilter,
      measureCounts,
      buildMeasureCard
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
            value:
              categoryCounts.approved + categoryCounts.rejected,
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
              panel.emptyMessage
            )}

                        {!controlsDisabled && panel.items.length > 0 ? (
              <div ref={listRef} className="border border-[var(--border-paper-soft)] rounded-md bg-[var(--bg-paper-soft)]">
                <VirtualizedList
                  items={panel.items}
                  getKey={(proposal) => proposal.id}
                  estimateSize={() => 60}
                  className="max-h-[72svh]"
                  renderItem={(proposal) => <ProposalReviewCard proposal={proposal} />}
                />
              </div>
            ) : null}
          </ProposalShell>
        ))}
      </div>

      <AlertDialog
        open={deleteRequest !== null}
        onOpenChange={(open) => !open && clearDeleteRequest()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a proposta &ldquo;
              {deleteRequest?.title ?? ""}
              &rdquo; permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={clearDeleteRequest}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteRequest?.onConfirm();
                clearDeleteRequest();
              }}
            >
              Apagar proposta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


