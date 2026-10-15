"use client";

import { useState, type ReactNode } from "react";
import { FilePenLine, Gavel, ScrollText, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminDrawer } from "@/lib/domains/admin/components/layout/AdminDrawer";
import { AdminReviewCard } from "@/lib/domains/admin/components/layout/AdminReviewCard";
import { statusBadgeVariant } from "@/lib/domains/admin/components/moderationUtils";

import { PROPOSAL_STATUS_LABELS } from "../proposalConstants";
import type { PendingProposalCard } from "../proposalTypes";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "../adminContentUi";

type ProposalField = PendingProposalCard["fields"][number];

function ProposalFieldInput({ field }: Readonly<{ field: ProposalField }>) {
  const icon =
    field.icon === "name" ? (
      <FilePenLine className="h-3.5 w-3.5" />
    ) : (
      <ScrollText className="h-3.5 w-3.5" />
    );

  return (
    <div className="space-y-2">
      <label
        htmlFor={field.id}
        className="editorial-kicker flex items-center gap-2"
      >
        {icon}
        {field.label}
      </label>
      {field.multiline ? (
        <Textarea
          id={field.id}
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          disabled={field.disabled}
          placeholder={field.placeholder}
          rows={3}
        />
      ) : (
        <Input
          id={field.id}
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          disabled={field.disabled}
          placeholder={field.placeholder}
        />
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

  if (onApprove) {
    actions.push({ key: "approve", label: "Aprovar", onClick: onApprove });
  }
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
      <Button
        variant="outline"
        disabled={isBusy || saveDisabled}
        onClick={onSave}
        className={`${ADMIN_OUTLINE_BUTTON_CLASS} w-full sm:w-auto`}
      >
        {saveLabel}
      </Button>
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.variant}
          disabled={isBusy}
          onClick={action.onClick}
          aria-label={`${action.label} proposta`}
          className={`${action.variant === "outline" ? ADMIN_OUTLINE_BUTTON_CLASS : ""} w-full sm:w-auto`}
        >
          {action.label}
        </Button>
      ))}
      <Button
        variant="outline"
        disabled={isBusy}
        className={`${ADMIN_OUTLINE_BUTTON_CLASS} ${deleteIcon ? "w-full gap-2 sm:w-auto" : "w-full sm:w-auto"}`}
        onClick={onDelete}
      >
        {deleteIcon}
        {deleteLabel}
      </Button>
    </>
  );
}

export function ProposalReviewCard({
  proposal,
}: Readonly<{ proposal: PendingProposalCard }>) {
  const [isOpen, setIsOpen] = useState(false);

  const closeAfter = (action: () => void) => {
    action();
    setIsOpen(false);
  };

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
          <p className="text-[10px] text-[var(--ink-muted)]">{proposal.meta}</p>
        </div>
        <Badge
          variant={statusBadgeVariant(proposal.status)}
          className="shrink-0 text-[10px]"
        >
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
            <Badge variant={statusBadgeVariant(proposal.status)}>
              {proposal.status}
            </Badge>
          }
          actions={
            <ProposalCardActions
              isBusy={proposal.isBusy}
              onSave={() => closeAfter(proposal.onSave)}
              saveLabel={proposal.saveLabel}
              saveDisabled={proposal.saveDisabled}
              onApprove={
                proposal.onApprove
                  ? () => closeAfter(proposal.onApprove!)
                  : undefined
              }
              onReject={
                proposal.onReject
                  ? () => closeAfter(proposal.onReject!)
                  : undefined
              }
              onReopen={
                proposal.onReopen
                  ? () => closeAfter(proposal.onReopen!)
                  : undefined
              }
              onDelete={() => closeAfter(proposal.onDelete)}
              deleteLabel={proposal.deleteLabel}
              deleteIcon={
                proposal.deleteIcon === "trash" ? (
                  <Trash2 className="h-4 w-4" />
                ) : undefined
              }
            />
          }
        >
          {proposal.note ? (
            <div className="flex items-center gap-2 text-[var(--ink-primary)]">
              <Gavel className="h-4 w-4" />
              <span className="editorial-kicker">
                {PROPOSAL_STATUS_LABELS[
                  proposal.note as keyof typeof PROPOSAL_STATUS_LABELS
                ] ?? proposal.note}
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
