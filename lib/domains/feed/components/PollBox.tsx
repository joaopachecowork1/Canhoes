"use client";

import { CheckCircle2 } from "lucide-react";

import type { EventFeedPollDto } from "@/lib/api/types";
import { cn, formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

const copy = messages.feed.PollBox;

export function PollBox({
  poll,
  onVote,
}: Readonly<{
  poll: EventFeedPollDto;
  onVote: (optionId: string) => void;
}>) {
  const totalVotes = Math.max(0, poll.totalVotes || 0);

  return (
    <section className="border border-[var(--color-veil)]/5 bg-[var(--color-veil)]/2.5 shadow-none rounded-[1.25rem] p-4 sm:p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="heading-3 text-[var(--text-primary)]">
            {poll.question}
          </h2>
        </div>

        <div className="space-y-3">
          {poll.options.map((option) => {
            const isActive = poll.myOptionId === option.id;
            const percentage =
              totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onVote(option.id)}
                aria-pressed={isActive}
                className={cn(
                  "relative min-h-11 w-full overflow-hidden rounded-[var(--radius-md-token)] border px-4 py-3 text-left transition-colors duration-200 ease-out",
                  isActive
                    ? "border-[var(--moss)]/50 bg-[var(--moss)]/5 ring-1 ring-[var(--moss)]/20"
                    : "border-[var(--border-subtle)] bg-[var(--bg-deep)] hover:border-[var(--border-moss)]/40 hover:bg-[var(--bg-surface)]"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-0 origin-left rounded-[var(--radius-md-token)] transition-transform duration-200 ease-out motion-reduce:transition-none",
                    isActive
                      ? "bg-[var(--moss)]/25"
                      : "bg-[var(--color-veil)]/6"
                  )}
                  style={{ transform: `scaleX(${percentage / 100})` }}
                  aria-hidden
                />

                <span className="relative flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                    {option.text}
                    {isActive && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--moss)]" />
                    )}
                  </span>
                  <span className={cn(
                    "text-sm",
                    isActive ? "text-[var(--moss-glow)] font-medium" : "text-[var(--text-muted)]"
                  )}>
                    {option.voteCount} · {percentage}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="body-small text-[var(--text-muted)]">
          {formatCount(totalVotes, copy.voteRecorded, copy.votesRecorded)}
          {copy.changeVoteHint}
        </p>
      </div>
    </section>
  );
}
