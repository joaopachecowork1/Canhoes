"use client";

import { CheckCircle2, Flame, Loader2, Vote } from "lucide-react";

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
      <div className="space-y-3 rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.12)] bg-[rgba(22,28,15,0.88)] p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-[var(--radius-md-token)] border border-[rgba(255,255,255,0.1)] p-3">
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
    <Card className="rounded-2xl border-[var(--border-paper)] bg-[var(--bg-paper)] text-[var(--ink-primary)]">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-secondary)]">{formatMessage(copy.progress, { voted, total })}</span>
          <span className="font-[var(--font-mono)] text-[var(--ink-primary)]">{`${percentage}%`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgba(95,123,56,0.16)]">
          <div className="h-full rounded-full bg-[var(--moss)] transition-all" style={{ width: `${percentage}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function BallotComplete() {
  return (
    <Card className="rounded-2xl border-[rgba(95,123,56,0.28)] bg-[rgba(95,123,56,0.1)] px-4 text-[var(--ink-primary)]">
      <CardContent className="py-6 text-center font-semibold text-[var(--moss)]">{copy.complete}</CardContent>
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
      className={cn(
        "w-full text-left px-3 py-2 flex items-center justify-between gap-3 border-[var(--border-paper-soft)] bg-[var(--bg-paper-soft)] shadow-none",
        isSelected && "border-[rgba(95,123,56,0.28)] bg-[rgba(95,123,56,0.08)]"
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--ink-primary)]">{label}</p>
      </div>
      <div className="shrink-0 text-[var(--moss)]">{statusIcon}</div>
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
    <CanhoesFeatureCard title={category.title} description={category.description ?? undefined} icon={Flame} className="relative">
      {canVote ? null : (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[rgba(42,30,21,0.12)] backdrop-blur-[1px] text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          {copy.closed}
        </div>
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
