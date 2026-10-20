"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminDrawer } from "@/lib/domains/admin/components/layout/AdminDrawer";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

import type { ProposalDraft, ProposalKind, useProposalModeration } from "../../hooks/useProposalModeration";

const copy = messages.admin.ProposalReviewItem;

type ProposalField = { key: string; label: string; multiline?: boolean; placeholder?: string };

/** The first field of each kind is required. */
const PROPOSAL_FIELDS: Record<ProposalKind, ProposalField[]> = {
  category: [
    { key: "name", label: copy.categoryNameLabel },
    { key: "description", label: copy.descriptionLabel, multiline: true, placeholder: copy.descriptionPlaceholder },
  ],
  measure: [{ key: "text", label: copy.measureTextLabel, placeholder: copy.measureTextPlaceholder }],
};

export type ProposalRow = {
  id: string;
  title: string;
  createdAtUtc: string;
  draft: ProposalDraft;
};

type Moderation = ReturnType<typeof useProposalModeration>;

function ProposalActions({
  isDisabled,
  isBusy,
  onDelete,
  onSave,
  title,
}: Readonly<{
  isDisabled: boolean;
  isBusy: boolean;
  onDelete: () => void;
  onSave: (status?: "approved" | "rejected") => void;
  title: string;
}>) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
      <Button variant="outline" disabled={isDisabled} onClick={() => onSave()}>
        {copy.save}
      </Button>
      <Button disabled={isDisabled} onClick={() => onSave("approved")}>
        {copy.approve}
      </Button>
      <Button variant="destructive" disabled={isDisabled} onClick={() => onSave("rejected")}>
        {copy.reject}
      </Button>
      <ConfirmDeleteAction
        title={copy.deleteTitle}
        description={formatMessage(copy.deleteDescription, { title })}
        onConfirm={onDelete}
        trigger={
          <Button variant="outline" disabled={isBusy} className="gap-2">
            <Trash2 className="h-4 w-4" />
            {copy.delete}
          </Button>
        }
      />
    </div>
  );
}

export function ProposalReviewItem({
  kind,
  moderation,
  proposal,
}: Readonly<{
  kind: ProposalKind;
  moderation: Moderation;
  proposal: ProposalRow;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(proposal.draft);
  const fields = PROPOSAL_FIELDS[kind];
  const createdAt = new Date(proposal.createdAtUtc).toLocaleString("pt-PT");

  const handleSave = (status?: "approved" | "rejected") => {
    moderation.handleSave({ kind, id: proposal.id, draft, status });
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-11 w-full flex-col border-b border-[var(--border-paper-soft)] p-3 text-left transition-colors hover:bg-[var(--bg-paper-soft)]"
      >
        <span className="truncate text-base font-medium text-[var(--ink-primary)]">{proposal.title}</span>
        <span className="text-xs text-[var(--ink-muted)]">{createdAt}</span>
      </button>

      <AdminDrawer
        open={isOpen}
        onOpenChange={setIsOpen}
        title={copy.drawerTitle}
        description={formatMessage(copy.receivedAt, { date: createdAt })}
      >
        {fields.map((field) => {
          const id = `${proposal.id}-${field.key}`;
          const Control = field.multiline ? Textarea : Input;
          return (
            <div key={field.key} className="space-y-2">
              <label htmlFor={id}>{field.label}</label>
              <Control
                id={id}
                value={draft[field.key]}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                disabled={moderation.isBusy}
                placeholder={field.placeholder}
              />
            </div>
          );
        })}

        <ProposalActions
          isBusy={moderation.isBusy}
          isDisabled={moderation.isBusy || !draft[fields[0].key].trim()}
          onSave={handleSave}
          onDelete={() => {
            moderation.handleDelete(kind, proposal.id);
            setIsOpen(false);
          }}
          title={proposal.title}
        />
      </AdminDrawer>
    </>
  );
}
