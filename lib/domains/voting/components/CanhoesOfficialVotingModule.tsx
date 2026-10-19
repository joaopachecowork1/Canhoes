"use client";

import { CheckCircle2, Flame, Loader2, Lock, Vote } from "lucide-react";

import type { CastOfficialVoteRequest, EventActiveContextDto, EventVotingBoardDto, EventVotingCategoryDto } from "@/lib/api/types";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { useCategorySelection } from "../hooks/useCategorySelection";
import { CompactSegmentTabs } from "@/lib/domains/event/components/CompactSegmentTabs";
import { getErrorMessage } from "@/lib/errors";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";
import { useOfficialVoting } from "../hooks/useOfficialVoting";
import { getVotingProgress } from "../rules/votingBoard";
import { cn } from "@/lib/utils";
import { CanhoesFeatureCard } from "@/lib/domains/event/components/CanhoesFeatureCard";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
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
          <div key={index} className="space-y-2 rounded-[var(--radius-md-token)] border border-[var(--color-veil)]/10 p-3">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function VotingProgressCard({ voted, total, percentage }: Readonly<{ voted: number; total: number; percentage: number }>) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-secondary)]">{formatMessage(copy.progress, { voted, total })}</span>
          <span className="font-[family-name:var(--font-mono)] text-[var(--ink-primary)]">{`${percentage}%`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--moss)]/16">
          <div className="h-full origin-left rounded-full bg-[var(--moss)] transition-transform duration-200" style={{ transform: `scaleX(${percentage / 100})` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function BallotComplete() {
  return (
    <Card className="border-[var(--moss)] px-4">
      <CardContent className="py-6 text-center font-semibold text-[var(--moss-glow)]">{copy.complete}</CardContent>
    </Card>
  );
}

export function CanhoesOfficialVotingModule({ initialData, initialContext }: { initialData?: EventVotingBoardDto; initialContext?: EventActiveContextDto | null }) {
  const { event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const { votingBoardQuery, castVoteMutation } = useOfficialVoting(eventId, initialData);

  if (votingBoardQuery.isLoading) {
    return (
      <div className="space-y-3">
        <CanhoesModuleHeader icon={Vote} title={copy.title} description={copy.loadingDescription} />
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

  return <OfficialBallot board={votingBoardQuery.data} castVoteMutation={castVoteMutation} />;
}

function OfficialBallot({
  board,
  castVoteMutation,
}: Readonly<{ board: EventVotingBoardDto; castVoteMutation: ReturnType<typeof useOfficialVoting>["castVoteMutation"] }>) {
  const categories = board.categories;
  const { selectedId: selectedCategoryId, setSelectedId: setSelectedCategoryId, selectedItem: selectedCategory } =
    useCategorySelection(categories, (category) => category.id);
  const progress = getVotingProgress(categories);

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader icon={Vote} title={copy.title} description={copy.description} badgeLabel={`${progress.voted}/${progress.total}`} />
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

function VoteOptionButton({
  isDisabled,
  isPending,
  isSelected,
  label,
  onClick,
}: Readonly<{ isDisabled: boolean; isPending: boolean; isSelected: boolean; label: string; onClick: () => void }>) {
  let statusIcon = null;
  if (isPending) statusIcon = <Loader2 className="h-4 w-4 animate-spin" />;
  else if (isSelected) statusIcon = <CheckCircle2 className="h-4 w-4" />;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-2 text-left transition-colors disabled:cursor-not-allowed",
        isSelected
          ? "border-solid border-[var(--moss)] bg-[var(--moss)] text-[var(--on-moss)] shadow-[var(--shadow-elevation-sm)]"
          : "border-dashed border-[var(--color-border-strong)] text-[var(--ink-primary)] hover:bg-[var(--bg-paper)] disabled:opacity-60"
      )}
    >
      <span className="min-w-0 truncate text-base font-semibold">{label}</span>
      <span className="shrink-0">{statusIcon}</span>
    </button>
  );
}

function OfficialVotingCategoryCard({
  category,
  canVote,
  isBusy,
  onVote,
  pendingPayload,
}: Readonly<{
  category: EventVotingCategoryDto;
  canVote: boolean;
  isBusy: boolean;
  onVote: (payload: CastOfficialVoteRequest) => void;
  pendingPayload: CastOfficialVoteRequest | null;
}>) {
  return (
    <CanhoesFeatureCard title={category.title} description={category.description ?? undefined} icon={Flame}>
      {canVote ? null : (
        <p className="flex items-center gap-2 rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 py-2 text-sm text-[var(--ink-secondary)]">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          {copy.closed}
        </p>
      )}

      {category.options.length > 0 ? (
        <div className="space-y-2">
          {category.options.map((option) => (
            <VoteOptionButton
              key={option.id}
              label={option.label}
              isDisabled={!canVote || isBusy}
              isSelected={category.myOptionId === option.id}
              isPending={isBusy && pendingPayload?.categoryId === category.id && pendingPayload.selectionId === option.id}
              onClick={() => onVote({ categoryId: category.id, selectionId: option.id })}
            />
          ))}
        </div>
      ) : null}
    </CanhoesFeatureCard>
  );
}
