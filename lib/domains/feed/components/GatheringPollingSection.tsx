"use client";

import { Check, CheckCircle2 } from "lucide-react";

import type { EventGatheringDateOptionDto } from "@/lib/api/types";
import { formatGatheringDate } from "@/lib/domains/gatherings/rules/gatheringFormatting";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import messages from "@/messages/pt.json";

const copy = messages.feed.GatheringBox;

type GatheringPollingSectionProps = {
  gatheringId: string;
  dateOptions: EventGatheringDateOptionDto[];
  totalVotes: number;
  isAdmin: boolean;
  onVoteDate: (gatheringId: string, optionId: string) => void;
  onConfirmDate: (gatheringId: string, dateText: string) => void;
};

/** Lista de datas candidatas e votação de disponibilidade */
export function GatheringPollingSection({
  gatheringId,
  dateOptions,
  totalVotes,
  isAdmin,
  onVoteDate,
  onConfirmDate,
}: Readonly<GatheringPollingSectionProps>) {
  const handleConfirm = (dateText: string) => {
    if (!confirm(copy.confirmDateConfirm)) return;
    onConfirmDate(gatheringId, dateText);
  };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-[var(--text-muted)]">{copy.voteHint}</p>

      <div className="space-y-2">
        {dateOptions.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;

          return (
            <div key={option.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onVoteDate(gatheringId, option.id)}
                className={cn(
                  "relative min-h-11 flex-1 overflow-hidden rounded-[var(--radius-md-token)] border px-4 py-2.5 text-left transition-colors",
                  option.hasVoted
                    ? "border-[var(--moss)]/50 bg-[var(--moss)]/10 ring-1 ring-[var(--moss)]/30"
                    : "border-[var(--border-subtle)] bg-[var(--bg-deep)] hover:border-[var(--moss)]/30",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-0 origin-left transition-transform duration-200",
                    option.hasVoted ? "bg-[var(--moss)]/20" : "bg-[var(--color-veil)]/8",
                  )}
                  style={{ transform: `scaleX(${percentage / 100})` }}
                  aria-hidden
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    {formatGatheringDate(option.dateText)}
                    {option.hasVoted ? <CheckCircle2 className="h-4 w-4 text-[var(--moss-glow)]" /> : null}
                  </span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {option.voteCount} ({percentage}
                    {"%"})
                  </span>
                </span>
              </button>

              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleConfirm(option.dateText)}
                  className="h-11 shrink-0 border-[var(--person-amber)]/40 text-xs hover:bg-[var(--person-amber)]/10"
                  title={copy.confirmThisDate}
                >
                  <Check className="mr-1 h-3.5 w-3.5 text-[var(--person-amber)]" />
                  {copy.confirmThisDate}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
