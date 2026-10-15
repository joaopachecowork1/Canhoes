"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminDrawer } from "@/lib/domains/admin/components/layout/AdminDrawer";

import type { ProposalDraft, ProposalKind, useProposalModeration } from "../hooks/useProposalModeration";

type ProposalField = { key: string; label: string; multiline?: boolean; placeholder?: string };

/** The first field of each kind is required. */
const PROPOSAL_FIELDS: Record<ProposalKind, ProposalField[]> = {
  category: [
    { key: "name", label: "Nome da categoria" },
    { key: "description", label: "Descrição", multiline: true, placeholder: "Contexto da proposta" },
  ],
  measure: [{ key: "text", label: "Texto da medida", placeholder: "Texto da proposta" }],
};

export type ProposalRow = {
  id: string;
  title: string;
  createdAtUtc: string;
  draft: ProposalDraft;
};

export function ProposalReviewItem({
  kind,
  moderation,
  proposal,
}: Readonly<{
  kind: ProposalKind;
  moderation: ReturnType<typeof useProposalModeration>;
  proposal: ProposalRow;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(proposal.draft);
  const fields = PROPOSAL_FIELDS[kind];
  const isDisabled = moderation.isBusy || !draft[fields[0].key].trim();
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
        <span className="truncate text-sm font-medium text-[var(--ink-primary)]">{proposal.title}</span>
        <span className="text-xs text-[var(--ink-muted)]">{createdAt}</span>
      </button>

      <AdminDrawer
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Detalhes da proposta"
        description={`Recebida a ${createdAt}`}
      >
        {fields.map((field) => {
          const id = `${proposal.id}-${field.key}`;
          const Control = field.multiline ? Textarea : Input;
          return (
            <div key={field.key} className="space-y-2">
              <label htmlFor={id} className="editorial-kicker">
                {field.label}
              </label>
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

        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="outline" disabled={isDisabled} onClick={() => handleSave()}>
            Guardar
          </Button>
          <Button disabled={isDisabled} onClick={() => handleSave("approved")}>
            Aprovar
          </Button>
          <Button variant="destructive" disabled={isDisabled} onClick={() => handleSave("rejected")}>
            Rejeitar
          </Button>
          <ConfirmDeleteAction
            title="Apagar proposta?"
            description={`Esta ação remove a proposta “${proposal.title}” permanentemente.`}
            onConfirm={() => {
              moderation.handleDelete(kind, proposal.id);
              setIsOpen(false);
            }}
            trigger={
              <Button variant="outline" disabled={moderation.isBusy} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Apagar proposta
              </Button>
            }
          />
        </div>
      </AdminDrawer>
    </>
  );
}
