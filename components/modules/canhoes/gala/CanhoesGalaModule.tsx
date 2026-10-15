"use client";

import { Medal, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { CanhoesMediaThumb } from "@/lib/domains/event/components/CanhoesMediaThumb";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/hooks/useEventOverview";
import { ErrorAlert } from "@/components/ui/error-alert";
import { getErrorMessage } from "@/lib/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { cn, formatCount } from "@/lib/utils";
import type { EventActiveContextDto, PublicCategoryResultDto } from "@/lib/api/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function renderPlacementIcon(position: number) {
  return position === 0 ? (
    <Trophy className="h-4 w-4 text-[var(--color-fire)]" />
  ) : (
    <Medal className="h-4 w-4 text-[var(--color-beige)]" />
  );
}

function NomineeRankCard({
  nominee,
  rank,
}: Readonly<{
  nominee: PublicCategoryResultDto["top"][number];
  rank: number;
}>) {
  const isWinner = rank === 0;

  return (
    <div
      className={cn(
        "canhoes-list-item flex items-center gap-3 rounded-[var(--radius-md-token)] border px-3 py-3 animate-[stagger-fade-in_0.3s_ease-out_both] transition-colors duration-200",
        isWinner
          ? "border-[rgba(0,255,136,0.3)] bg-[linear-gradient(180deg,rgba(0,255,136,0.06),transparent)] shadow-[0_0_12px_rgba(0,255,136,0.08)]"
          : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(122,173,58,0.15)]"
      )}
      style={{ animationDelay: `${rank * 0.08}s` }}
    >
      <CanhoesMediaThumb alt={nominee.title} src={nominee.imageUrl} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--ink-primary)]">
            {renderPlacementIcon(rank)} #{rank + 1}
          </span>
          <span className="truncate font-semibold text-[var(--ink-primary)]">
            {nominee.title}
          </span>
        </div>
        <p className="body-small text-[var(--ink-secondary)]">{formatCount(nominee.voteCount, "voto", "votos")}</p>
      </div>

      {isWinner ? <Badge variant="default">Vencedor</Badge> : null}
    </div>
  );
}

/** Gala page: the top results of each category, open in the RESULTS phase. */
export function CanhoesGalaModule({ initialContext, initialResults }: {
    initialContext?: EventActiveContextDto | null;
    initialResults?: PublicCategoryResultDto[];
}) {
  const { event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;

  const { data: resultsByCategory = [], isLoading, error, refetch } = useQuery({
    queryKey: ["galaResults", eventId],
    queryFn: () => awardsRepo.getResults(eventId!),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialResults,
  });

  const errorMessage = error ? getErrorMessage(error, "Não foi possível carregar os resultados da gala.") : null;

  const totalVotes = resultsByCategory.reduce(
    (voteCount, categoryResult) => voteCount + (categoryResult.totalVotes ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Trophy}
        title="Gala"
        description="Os três mais votados de cada categoria."
        badgeLabel={formatCount(totalVotes, "voto", "votos")}
      />

      {isLoading ? <GalaLoadingState /> : null}

      {!isLoading && errorMessage ? (
        <ErrorAlert
          title="Erro ao carregar resultados"
          description={errorMessage}
          actionLabel="Tentar novamente"
          onAction={() => void refetch()}
        />
      ) : null}

      {!isLoading && !errorMessage && resultsByCategory.length === 0 ? (
        <p className="body-small text-[var(--ink-secondary)]">Sem resultados ainda.</p>
      ) : null}

      {resultsByCategory.length > 0 ? (
        <div className="space-y-4">
          {resultsByCategory.map((categoryResult) => (
            <Card key={categoryResult.categoryId}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  <span>{categoryResult.categoryName}</span>
                  <Badge variant="amber">{formatCount(categoryResult.totalVotes, "voto", "votos")}</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-3">
                  {categoryResult.top.length === 0 ? (
                    <p className="body-small text-[var(--ink-secondary)]">Sem nomeações aprovadas.</p>
                  ) : (
                    categoryResult.top.map((nominee, index) => (
                      <NomineeRankCard key={nominee.nomineeId} nominee={nominee} rank={index} />
                    ))
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
