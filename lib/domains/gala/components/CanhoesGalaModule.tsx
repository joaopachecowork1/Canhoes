"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { getErrorMessage } from "@/lib/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import type { EventActiveContextDto, PublicCategoryResultDto } from "@/lib/api/types";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

import { formatVotes, GalaCategoryResult } from "./GalaCategoryResult";

const copy = messages.gala.CanhoesGalaModule;

function GalaLoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-4 w-full rounded" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-[var(--radius-md-token)]" />
            <Skeleton className="h-16 w-full rounded-[var(--radius-md-token)]" />
            <Skeleton className="h-16 w-full rounded-[var(--radius-md-token)]" />
            <Skeleton className="h-4 w-40 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GalaResults({
  errorMessage,
  isLoading,
  isResultsPhase,
  onRetry,
  resultsByCategory,
}: Readonly<{
  errorMessage: string | null;
  isLoading: boolean;
  isResultsPhase: boolean;
  onRetry: () => void;
  resultsByCategory: PublicCategoryResultDto[];
}>) {
  if (isLoading) return <GalaLoadingState />;
  const hasNoRanking = resultsByCategory.every((categoryResult) => categoryResult.top.length === 0);

  // Um refetch falhado mantém no ecrã os resultados já carregados, por baixo do erro.
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
      {hasNoRanking && !errorMessage ? (
        <EmptyState
          icon={Trophy}
          title={isResultsPhase ? copy.noVotesTitle : copy.emptyTitle}
          description={isResultsPhase ? copy.noVotesDescription : copy.emptyDescription}
          action={
            <Button asChild variant="outline" className="w-full">
              <Link href="/canhoes">{copy.backToMural}</Link>
            </Button>
          }
        />
      ) : null}
      {!hasNoRanking ? (
        <div className="space-y-4">
          {resultsByCategory.map((categoryResult) => (
            <GalaCategoryResult key={categoryResult.categoryId} categoryResult={categoryResult} />
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Página da gala: os primeiros classificados de cada categoria, aberta na fase RESULTS. */
export function CanhoesGalaModule({
  initialContext,
  initialResults,
}: {
  initialContext?: EventActiveContextDto | null;
  initialResults?: PublicCategoryResultDto[];
}) {
  const { event, overview } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;

  const {
    data: resultsByCategory = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.galaResults(eventId),
    queryFn: () => awardsRepo.getResults(eventId ?? ""),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialResults,
  });

  const totalVotes = resultsByCategory.reduce((voteCount, categoryResult) => voteCount + categoryResult.totalVotes, 0);

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        module="gala"
        title={copy.title}
        description={copy.description}
        badgeLabel={totalVotes > 0 ? formatVotes(totalVotes) : undefined}
      />
      <GalaResults
        errorMessage={error ? getErrorMessage(error, copy.loadError) : null}
        isLoading={isLoading}
        isResultsPhase={overview?.activePhase?.type === "RESULTS"}
        onRetry={() => void refetch()}
        resultsByCategory={resultsByCategory}
      />
    </div>
  );
}
