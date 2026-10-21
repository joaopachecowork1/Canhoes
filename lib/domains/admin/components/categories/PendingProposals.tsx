"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStateMessage } from "@/lib/domains/admin/components/layout/AdminStateMessage";

import { ADMIN_CONTENT_CARD_CLASS } from "../adminContentUi";
import { useAdminProposals } from "../../hooks/useAdminProposals";
import { useProposalModeration, type ProposalKind } from "../../hooks/useProposalModeration";
import { ProposalReviewItem, type ProposalRow } from "./ProposalReviewItem";
import messages from "@/messages/pt.json";

const copy = messages.admin.PendingProposals;

type PendingProposalsProps = {
  eventId: string | null;
  onUpdate: () => Promise<void>;
};

// títulos e textos de cada painel, por tipo de proposta
const PANEL_META: Record<ProposalKind, { title: string; description: string; emptyMessage: string }> = copy.panels;

/** Filas de propostas por rever (categorias e medidas); sem evento mostra só um aviso. */
export function PendingProposals({ eventId, ...props }: Readonly<PendingProposalsProps>) {
  if (!eventId) {
    return <AdminStateMessage>{copy.noEvent}</AdminStateMessage>;
  }
  return <ProposalQueue eventId={eventId} {...props} />;
}

/** Dois painéis lado a lado, um por tipo de proposta, com a moderação partilhada. */
function ProposalQueue({ eventId, onUpdate }: Readonly<PendingProposalsProps & { eventId: string }>) {
  const { categoryProposals, measureProposals, isLoading: loading } = useAdminProposals(eventId);
  const moderation = useProposalModeration(eventId, onUpdate);

  // as propostas passam a linhas comuns, com o rascunho editável de cada tipo
  const panels: Array<{ kind: ProposalKind; rows: ProposalRow[] }> = [
    {
      kind: "category",
      rows: categoryProposals.map((proposal) => ({
        id: proposal.id,
        title: proposal.name,
        createdAtUtc: proposal.createdAtUtc,
        draft: { name: proposal.name, description: proposal.description ?? "" },
      })),
    },
    {
      kind: "measure",
      rows: measureProposals.map((proposal) => ({
        id: proposal.id,
        title: proposal.text,
        createdAtUtc: proposal.createdAtUtc,
        draft: { text: proposal.text },
      })),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {panels.map(({ kind, rows }) => (
        <Card key={kind} className={ADMIN_CONTENT_CARD_CLASS}>
          <CardHeader className="space-y-2">
            <CardTitle>{`${PANEL_META[kind].title} (${rows.length})`}</CardTitle>
            <p className="body-small max-w-[64ch] text-[var(--color-text-muted)]">{PANEL_META[kind].description}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 ? (
              <AdminStateMessage variant="panel">
                {loading ? copy.loading : PANEL_META[kind].emptyMessage}
              </AdminStateMessage>
            ) : (
              <div className="rounded-md border border-[var(--border-paper-soft)] bg-[var(--bg-paper-soft)]">
                {rows.map((row) => (
                  <ProposalReviewItem key={row.id} kind={kind} moderation={moderation} proposal={row} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
