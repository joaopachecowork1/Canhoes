"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import type { EventActiveContextDto, EventOverviewDto, EventVotingBoardDto } from "@/lib/api/types";
import { OfficialVotingCategoryCard } from "./OfficialVotingCategoryCard";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { useCategorySelection } from "../hooks/useCategorySelection";
import { CompactSegmentTabs } from "@/lib/domains/event/components/CompactSegmentTabs";
import { getErrorMessage } from "@/lib/errors";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";
import { useOfficialVoting } from "../hooks/useOfficialVoting";
import { getVotingProgress } from "../rules/votingBoard";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";

const copy = messages.voting.CanhoesOfficialVotingModule;

function OfficialVotingLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-[var(--radius-lg-token)]" />
      <Skeleton className="h-10 rounded-full" />
      <div className="space-y-3 rounded-[var(--radius-lg-token)] border border-[var(--color-veil)]/12 bg-[var(--color-panel)]/88 p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="space-y-2 rounded-[var(--radius-md-token)] border border-[var(--color-veil)]/10 p-3"
          >
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barra com quantas categorias já votaste e a percentagem concluída. */
function VotingProgressCard({
  voted,
  total,
  percentage,
}: Readonly<{ voted: number; total: number; percentage: number }>) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-secondary)]">{formatMessage(copy.progress, { voted, total })}</span>
          <span className="font-[family-name:var(--font-mono)] text-[var(--ink-primary)]">{`${percentage}%`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--moss)]/16">
          <div
            className="h-full origin-left rounded-full bg-[var(--moss)] transition-transform duration-200"
            style={{ transform: `scaleX(${percentage / 100})` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** O que substitui o boletim quando a votação não está aberta: ainda não (nomear, ou voltar ao mural) ou já acabou (seguir para a gala). */
function BallotClosedState({ isOver, canNominate }: Readonly<{ canNominate: boolean; isOver: boolean }>) {
  let action = { href: "/canhoes", label: copy.backToMural };
  if (isOver) action = { href: "/canhoes/gala", label: copy.seeGala };
  else if (canNominate) action = { href: "/canhoes/nomeacoes", label: copy.goNominate };

  return (
    <EmptyState
      icon={Lock}
      title={isOver ? copy.overTitle : copy.closedTitle}
      description={isOver ? copy.over : copy.closed}
      tone="official"
      action={
        <Button asChild className="w-full">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      }
    />
  );
}

/** Página mostrada quando ainda não se pode votar, ou a votação já terminou. */
function ClosedBallot({ overview }: Readonly<{ overview: EventOverviewDto | null }>) {
  return (
    <div className="space-y-4">
      <CanhoesModuleHeader module="voting" title={copy.title} description={copy.description} />
      <BallotClosedState
        isOver={overview?.activePhase?.type === "RESULTS"}
        canNominate={Boolean(overview?.modules.nominees)}
      />
    </div>
  );
}

function BallotComplete() {
  return (
    <Card className="border-[var(--moss)] px-4">
      <CardContent className="py-6 text-center font-semibold text-[var(--moss-glow)]">{copy.complete}</CardContent>
    </Card>
  );
}

export function CanhoesOfficialVotingModule({
  initialData,
  initialContext,
}: {
  initialData?: EventVotingBoardDto;
  initialContext?: EventActiveContextDto | null;
}) {
  const { event, overview } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const { votingBoardQuery, castVoteMutation } = useOfficialVoting(eventId, initialData);

  if (votingBoardQuery.isLoading) {
    return (
      <div className="space-y-3">
        <CanhoesModuleHeader module="voting" title={copy.title} description={copy.loadingDescription} />
        <OfficialVotingLoadingState />
      </div>
    );
  }

  if (!eventId || votingBoardQuery.error || !votingBoardQuery.data) {
    return (
      <ErrorAlert
        title={copy.loadErrorTitle}
        description={getErrorMessage(votingBoardQuery.error, copy.loadError)}
        actionLabel={messages.common.retry}
        tone="official"
        onAction={() => void votingBoardQuery.refetch()}
      />
    );
  }

  if (!votingBoardQuery.data.canVote) return <ClosedBallot overview={overview} />;

  return <OfficialBallot board={votingBoardQuery.data} castVoteMutation={castVoteMutation} />;
}

/** O boletim: separadores por categoria, progresso e as opções da categoria selecionada. */
function OfficialBallot({
  board,
  castVoteMutation,
}: Readonly<{
  board: EventVotingBoardDto;
  castVoteMutation: ReturnType<typeof useOfficialVoting>["castVoteMutation"];
}>) {
  const categories = board.categories;
  const {
    selectedId: selectedCategoryId,
    setSelectedId: setSelectedCategoryId,
    selectedItem: selectedCategory,
  } = useCategorySelection(categories, (category) => category.id);
  const progress = getVotingProgress(categories);

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader module="voting" title={copy.title} description={copy.description} />
      <VotingProgressCard voted={progress.voted} total={progress.total} percentage={progress.percentage} />
      <CompactSegmentTabs
        activeId={selectedCategoryId ?? ""}
        items={categories.map((category) => ({
          id: category.id,
          label: category.title,
          badge: category.myOptionId ? copy.votedBadge : undefined,
        }))}
        onSelect={setSelectedCategoryId}
      />

      {selectedCategory ? (
        <OfficialVotingCategoryCard
          category={selectedCategory}
          canVote={board.canVote}
          isBusy={castVoteMutation.isPending}
          onVote={(vote) => castVoteMutation.mutate(vote)}
          pendingPayload={castVoteMutation.variables ?? null}
        />
      ) : null}

      {progress.isComplete ? <BallotComplete /> : null}
    </div>
  );
}
