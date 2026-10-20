"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel, Inbox } from "lucide-react";
import { toast } from "sonner";

import type { EventActiveContextDto, GalaMeasureDto } from "@/lib/api/types";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.measures.CanhoesMeasuresModule;

function MeasuresLoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2 p-2.5">
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

// Tamanho mínimo (sem espaços nas pontas) para a proposta não ser só ruído.
const MIN_MEASURE_LENGTH = 5;

function getSubmitLabel(isSubmitting: boolean, isProposalPhase: boolean) {
  if (isSubmitting) return messages.common.sending;
  return isProposalPhase ? copy.submit : copy.proposalsClosed;
}

/** Formulário para propor uma medida; só envia enquanto as propostas estão abertas. */
function MeasureProposalForm({
  eventId,
  isProposalPhase,
}: Readonly<{ eventId: string | null; isProposalPhase: boolean }>) {
  const [proposalText, setProposalText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmitProposal = proposalText.trim().length >= MIN_MEASURE_LENGTH && isProposalPhase;

  const handleProposalSubmit = async () => {
    if (!canSubmitProposal || !eventId) return;

    setIsSubmitting(true);
    try {
      await awardsRepo.createMeasureProposal(eventId, { text: proposalText.trim() });
      setProposalText("");
      toast.success(copy.proposed);
    } catch (error) {
      logFrontendError("CanhoesMeasures.handleProposalSubmit", error);
      toast.error(getErrorMessage(error, copy.submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-[var(--person-amber)]" />
          {copy.formTitle}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="measure-text-input">{copy.textLabel}</label>
          <Textarea
            id="measure-text-input"
            value={proposalText}
            onChange={(event) => setProposalText(event.target.value)}
            placeholder={copy.textPlaceholder}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{copy.pendingHint}</p>
          <Button
            disabled={!canSubmitProposal || isSubmitting}
            onClick={() => void handleProposalSubmit()}
            aria-label={copy.submitLabel}
          >
            {getSubmitLabel(isSubmitting, isProposalPhase)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Estados da lista de medidas: erro, a carregar, vazia ou com resultados. */
function MeasureList({
  errorMessage,
  isLoading,
  measures,
  onRetry,
}: Readonly<{ errorMessage: string | null; isLoading: boolean; measures: GalaMeasureDto[]; onRetry: () => void }>) {
  return (
    <>
      {errorMessage ? (
        <ErrorAlert
          title={copy.loadErrorTitle}
          description={errorMessage}
          actionLabel={messages.common.retry}
          onAction={onRetry}
        />
      ) : null}

      {isLoading && measures.length === 0 ? <MeasuresLoadingState /> : null}

      {!isLoading && !errorMessage && measures.length === 0 ? (
        <EmptyState icon={Inbox} title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : null}

      {measures.length > 0 ? (
        <div className="space-y-2">
          {measures.map((measure) => (
            <div key={measure.id} className="space-y-1 p-2.5">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">{measure.text}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {new Date(measure.createdAtUtc).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Carrega as medidas aprovadas do evento. */
function useMeasures(eventId: string | null, initialData: GalaMeasureDto[] | undefined) {
  return useQuery({
    queryKey: queryKeys.measures(eventId),
    queryFn: () => awardsRepo.getMeasures(eventId ?? ""),
    enabled: !!eventId,
    // Não vale a pena semear uma lista vazia do servidor: esconderia o estado de carregamento do primeiro fetch.
    initialData: initialData?.length ? initialData : undefined,
    staleTime: 1000 * 60 * 2,
  });
}

/** Página das Medidas: as regras aprovadas da gala e o formulário para propor uma. */
export function CanhoesMeasuresModule({
  initialData,
  initialContext,
}: {
  initialData?: GalaMeasureDto[];
  initialContext?: EventActiveContextDto | null;
}) {
  const { overview, event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: measures = [], isLoading, error } = useMeasures(eventId, initialData);

  const phaseType = overview?.activePhase?.type;
  const searchTerm = search.trim().toLowerCase();
  const filteredMeasures = searchTerm
    ? measures.filter((measure) => measure.text.toLowerCase().includes(searchTerm))
    : measures;

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader module="measures" title={copy.title} description={copy.description} />

      <MeasureProposalForm eventId={eventId} isProposalPhase={phaseType === "PROPOSALS"} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{copy.approvedTitle}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-9"
          />
          <MeasureList
            errorMessage={error ? getErrorMessage(error, copy.loadError) : null}
            isLoading={isLoading}
            measures={filteredMeasures}
            onRetry={() => void queryClient.invalidateQueries({ queryKey: queryKeys.measures(eventId) })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
