"use client";

import { CheckCircle2, Flame, Loader2 } from "lucide-react";

import type { CastOfficialVoteRequest, EventVotingCategoryDto } from "@/lib/api/types";
import { CanhoesFeatureCard } from "@/lib/domains/event/components/CanhoesFeatureCard";
import { cn } from "@/lib/utils";

/** Uma opção de voto; mostra um indicador enquanto grava e um visto quando é a escolhida. */
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
          : "border-dashed border-[var(--color-border-strong)] text-[var(--ink-primary)] hover:bg-[var(--bg-paper)] disabled:opacity-60",
      )}
    >
      <span className="min-w-0 truncate text-base font-semibold">{label}</span>
      <span className="shrink-0">{statusIcon}</span>
    </button>
  );
}

export function OfficialVotingCategoryCard({
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
      {category.options.length > 0 ? (
        <div className="space-y-2">
          {category.options.map((option) => (
            <VoteOptionButton
              key={option.id}
              label={option.label}
              isDisabled={!canVote || isBusy}
              isSelected={category.myOptionId === option.id}
              isPending={
                isBusy && pendingPayload?.categoryId === category.id && pendingPayload.selectionId === option.id
              }
              onClick={() => onVote({ categoryId: category.id, selectionId: option.id })}
            />
          ))}
        </div>
      ) : null}
    </CanhoesFeatureCard>
  );
}
