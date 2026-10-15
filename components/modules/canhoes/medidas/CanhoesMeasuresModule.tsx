"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Gavel, Inbox } from "lucide-react";
import { toast } from "sonner";

import type { EventActiveContextDto, GalaMeasureDto } from "@/lib/api/types";
import {
  CanhoesModuleHeader,
  formatEventPhaseLabel,
} from "@/components/modules/canhoes/CanhoesModuleParts";
import { useEventOverview } from "@/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

function MeasuresLoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="canhoes-list-item space-y-2 p-2.5">
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Medidas page: the approved gala rules and the form to propose one. */
export function CanhoesMeasuresModule({ initialData, initialContext }: { initialData?: GalaMeasureDto[]; initialContext?: EventActiveContextDto | null }) {
  const { overview, event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryClient = useQueryClient();

  const { data: measures = [], isLoading, error } = useQuery({
    queryKey: ["measures", eventId],
    queryFn: () => awardsRepo.getMeasures(eventId!),
    enabled: !!eventId,
    initialData: initialData && initialData.length > 0 ? initialData : undefined,
    staleTime: 1000 * 60 * 2,
  });

  const errorMessage = error ? getErrorMessage(error, "Não foi possível carregar as medidas desta edição.") : null;

  const [proposalText, setProposalText] = useState("");
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phaseType = overview?.activePhase?.type;
  const nominationPhase = phaseType === "PROPOSALS";
  const canSubmitProposal = proposalText.trim().length >= 5 && nominationPhase;
  const submitButtonLabel = isSubmitting
    ? "A enviar..."
    : nominationPhase
    ? "Propor"
    : "Propostas fechadas";

  const handleProposalSubmit = async () => {
    if (!canSubmitProposal || !eventId) return;

    setIsSubmitting(true);
    try {
      await awardsRepo.createMeasureProposal(eventId, { text: proposalText.trim() });
      setProposalText("");
      toast.success("Medida proposta");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Não foi possível submeter a medida."
      );
      logFrontendError("CanhoesMeasures.handleProposalSubmit", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMeasures = measures.filter((measure) =>
    search.trim()
      ? measure.text.toLowerCase().includes(search.trim().toLowerCase())
      : true
  );

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Flame}
        title="Medidas"
        description="Regras e castigos para a gala, propostos pelo grupo."
        badgeLabel={
          phaseType ? `Fase: ${formatEventPhaseLabel(phaseType)}` : undefined
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-[var(--color-fire)]" />
            Propor medida
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="measure-text-input" className="canhoes-field-label">Texto</label>
            <Textarea
              id="measure-text-input"
              value={proposalText}
              onChange={(event) => setProposalText(event.target.value)}
              placeholder="Ex.: Quem perder paga uma rodada"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="canhoes-helper-text">A proposta fica pendente até aprovação de um admin.</p>
            <Button disabled={!canSubmitProposal || isSubmitting} onClick={() => void handleProposalSubmit()} aria-label="Submeter proposta">
              {submitButtonLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Medidas aprovadas</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Procurar medida"
            className="h-9"
          />

          {errorMessage ? (
            <ErrorAlert
              title="Erro ao carregar medidas"
              description={errorMessage}
              actionLabel="Tentar novamente"
              onAction={() => void queryClient.invalidateQueries({ queryKey: ["measures", eventId] })}
            />
          ) : null}

          {isLoading && filteredMeasures.length === 0 ? <MeasuresLoadingState /> : null}

          {!isLoading && !errorMessage && filteredMeasures.length === 0 ? (
            <EmptyState icon={Inbox} title="Sem medidas" description="Ainda não há medidas nesta edição." />
          ) : null}

          {filteredMeasures.length > 0 ? (
            <div className="space-y-2">
              {filteredMeasures.map((measure) => (
                <div key={measure.id} className="canhoes-list-item space-y-1 p-2.5">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{measure.text}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(measure.createdAtUtc).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
