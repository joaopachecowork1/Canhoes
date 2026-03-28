"use client";

import { useMemo, useState } from "react";
import { Gavel, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canhoesRepo } from "@/lib/repositories/canhoesRepo";
import type { CategoryProposalDto, MeasureProposalDto } from "@/lib/api/types";

type PendingProposalsProps = {
  categoryProposals: CategoryProposalDto[];
  measureProposalsAll: MeasureProposalDto[];
  loading: boolean;
  onUpdate: () => Promise<void>;
};

type MeasureFilter = "pending" | "approved" | "rejected";

const FILTER_LABELS: Record<MeasureFilter, string> = {
  approved: "Aprovadas",
  pending: "Pendentes",
  rejected: "Rejeitadas",
};

function ProposalShell({
  children,
  title,
  subtitle,
}: Readonly<{
  children: React.ReactNode;
  title: string;
  subtitle: string;
}>) {
  return (
    <Card className="border-[var(--color-moss)]/20">
      <CardHeader className="space-y-1">
        <p className="editorial-kicker">{subtitle}</p>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function PendingProposals({
  categoryProposals,
  measureProposalsAll,
  loading,
  onUpdate,
}: Readonly<PendingProposalsProps>) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [measureFilter, setMeasureFilter] = useState<MeasureFilter>("pending");
  const [measureDrafts, setMeasureDrafts] = useState<Record<string, string>>({});

  const filteredMeasureProposals = useMemo(
    () =>
      (measureProposalsAll ?? []).filter(
        (proposal) => proposal.status === measureFilter
      ),
    [measureFilter, measureProposalsAll]
  );

  const withProcessing = async (
    proposalId: string,
    action: () => Promise<void>
  ) => {
    setProcessingIds((previousIds) => new Set(previousIds).add(proposalId));

    try {
      await action();
      await onUpdate();
      toast.success("Acao concluida");
    } catch (error) {
      console.error("Proposal action error:", error);
      toast.error("Erro ao processar proposta");
    } finally {
      setProcessingIds((previousIds) => {
        const nextIds = new Set(previousIds);
        nextIds.delete(proposalId);
        return nextIds;
      });
    }
  };

  const setMeasureDraft = (proposalId: string, text: string) => {
    setMeasureDrafts((previousDrafts) => ({
      ...previousDrafts,
      [proposalId]: text,
    }));
  };

  const getMeasureDraft = (proposal: MeasureProposalDto) =>
    measureDrafts[proposal.id] ?? proposal.text;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ProposalShell
        title={`Propostas de categorias (${categoryProposals.length})`}
        subtitle="Aprovacao"
      >
        <p className="body-small text-[var(--color-text-muted)]">
          As propostas aparecem como blocos de moderacao, com contexto e accoes
          directas, sem parecer uma lista crua.
        </p>

        {loading ? (
          <div className="body-small text-[var(--color-text-muted)]">
            A carregar propostas...
          </div>
        ) : null}

        {!loading && categoryProposals.length === 0 ? (
          <div className="rounded-[var(--radius-md-token)] border border-dashed border-[var(--color-moss)]/20 bg-[var(--color-bg-surface)]/50 px-4 py-8 text-center body-small text-[var(--color-text-muted)]">
            Sem propostas de categoria pendentes.
          </div>
        ) : null}

        {!loading &&
          categoryProposals.map((proposal) => {
            const isBusy = processingIds.has(proposal.id);

            return (
              <article
                key={proposal.id}
                className="editorial-shell rounded-[var(--radius-md-token)] px-4 py-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="heading-3 text-[var(--color-text-primary)]">
                      {proposal.name}
                    </h3>
                    <Badge variant="secondary">Pendente</Badge>
                  </div>

                  {proposal.description ? (
                    <p className="body-small text-[var(--color-text-secondary)]">
                      {proposal.description}
                    </p>
                  ) : null}

                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(proposal.createdAtUtc).toLocaleString("pt-PT")}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={isBusy}
                    onClick={() =>
                      withProcessing(proposal.id, async () => {
                        await canhoesRepo.adminApproveCategoryProposal(
                          proposal.id
                        );
                      })
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isBusy}
                    onClick={() =>
                      withProcessing(proposal.id, async () => {
                        await canhoesRepo.adminRejectCategoryProposal(
                          proposal.id
                        );
                      })
                    }
                  >
                    Rejeitar
                  </Button>
                </div>
              </article>
            );
          })}
      </ProposalShell>

      <ProposalShell
        title={`Propostas de medidas (${measureProposalsAll.length})`}
        subtitle="Curadoria"
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as MeasureFilter[]).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={measureFilter === status ? "default" : "outline"}
              className="rounded-full px-4"
              onClick={() => setMeasureFilter(status)}
            >
              {FILTER_LABELS[status]}
              <Badge
                variant="secondary"
                className="ml-2 min-w-5 justify-center px-1.5 text-[11px]"
              >
                {
                  measureProposalsAll.filter(
                    (proposal) => proposal.status === status
                  ).length
                }
              </Badge>
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="body-small text-[var(--color-text-muted)]">
            A carregar propostas...
          </div>
        ) : null}

        {!loading && filteredMeasureProposals.length === 0 ? (
          <div className="rounded-[var(--radius-md-token)] border border-dashed border-[var(--color-moss)]/20 bg-[var(--color-bg-surface)]/50 px-4 py-8 text-center body-small text-[var(--color-text-muted)]">
            Sem propostas neste estado.
          </div>
        ) : null}

        {!loading &&
          filteredMeasureProposals.map((proposal) => {
            const isBusy = processingIds.has(proposal.id);
            const draftText = getMeasureDraft(proposal);

            return (
              <article
                key={proposal.id}
                className="editorial-shell rounded-[var(--radius-md-token)] px-4 py-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-[var(--color-title)]">
                      <Gavel className="h-4 w-4" />
                      <span className="editorial-kicker">
                        {FILTER_LABELS[proposal.status as MeasureFilter] ??
                          proposal.status}
                      </span>
                    </div>
                    <Badge
                      variant={
                        proposal.status === "approved"
                          ? "default"
                          : proposal.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {proposal.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <label className="editorial-kicker flex items-center gap-2">
                      <ScrollText className="h-3.5 w-3.5" />
                      Texto da medida
                    </label>
                    <Input
                      value={draftText}
                      onChange={(event) =>
                        setMeasureDraft(proposal.id, event.target.value)
                      }
                      disabled={isBusy}
                      placeholder="Texto da proposta"
                    />
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(proposal.createdAtUtc).toLocaleString("pt-PT")}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={isBusy || !draftText.trim()}
                    onClick={() =>
                      withProcessing(proposal.id, async () => {
                        await canhoesRepo.adminUpdateMeasureProposal(
                          proposal.id,
                          { text: draftText.trim() }
                        );
                      })
                    }
                  >
                    Guardar texto
                  </Button>
                  <Button
                    disabled={isBusy}
                    onClick={() =>
                      withProcessing(proposal.id, async () => {
                        const normalizedText = draftText.trim();

                        if (normalizedText && normalizedText !== proposal.text) {
                          await canhoesRepo.adminUpdateMeasureProposal(
                            proposal.id,
                            { text: normalizedText }
                          );
                        }

                        await canhoesRepo.adminApproveMeasureProposal(proposal.id);
                      })
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isBusy}
                    onClick={() =>
                      withProcessing(proposal.id, async () => {
                        await canhoesRepo.adminRejectMeasureProposal(proposal.id);
                      })
                    }
                  >
                    Rejeitar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isBusy}
                    onClick={() =>
                      withProcessing(proposal.id, async () => {
                        await canhoesRepo.adminDeleteMeasureProposal(proposal.id);
                      })
                    }
                  >
                    Apagar
                  </Button>
                </div>
              </article>
            );
          })}
      </ProposalShell>
    </div>
  );
}
