"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryProposalDto, MeasureProposalDto } from "@/lib/api/types";
import { AdminStateMessage } from "@/lib/domains/admin/components/layout/AdminStateMessage";

import { ADMIN_CONTENT_CARD_CLASS } from "../adminContentUi";
import { useProposalModeration, type ProposalKind } from "../../hooks/useProposalModeration";
import { ProposalReviewItem, type ProposalRow } from "./ProposalReviewItem";
import messages from "@/messages/pt.json";

const copy = messages.admin.PendingProposals;

type PendingProposalsProps = {
  eventId: string | null;
  categoryProposals: CategoryProposalDto[];
  measureProposals: MeasureProposalDto[];
  loading: boolean;
  onUpdate: () => Promise<void>;
};

const PANEL_META: Record<ProposalKind, { title: string; description: string; emptyMessage: string }> = copy.panels;

export function PendingProposals({ eventId, ...props }: Readonly<PendingProposalsProps>) {
  if (!eventId) {
    return <AdminStateMessage>{copy.noEvent}</AdminStateMessage>;
  }
  return <ProposalQueue eventId={eventId} {...props} />;
}

function ProposalQueue({
  eventId,
  categoryProposals,
  measureProposals,
  loading,
  onUpdate,
}: Readonly<PendingProposalsProps & { eventId: string }>) {
  const moderation = useProposalModeration(eventId, onUpdate);

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
            <p className="body-small max-w-[64ch] text-[var(--color-text-muted)]">
              {PANEL_META[kind].description}
            </p>
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
