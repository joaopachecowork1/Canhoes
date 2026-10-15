"use client";

import { CheckCircle2 } from "lucide-react";

import type { EventFeedPollDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function PollBox({
  poll,
  onVote,
}: Readonly<{
  poll: EventFeedPollDto;
  onVote: (optionId: string) => void;
}>) {
  const totalVotes = Math.max(0, poll.totalVotes || 0);

  return (
    <section className="border border-white/5 bg-white/[0.025] shadow-none rounded-[1.25rem] p-4 sm:p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="editorial-kicker text-[var(--text-muted)]">Sondagem</p>
          <h3 className="heading-3 text-[var(--text-primary)]">
            {poll.question}
          </h3>
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
                aria-label={`${option.text} — ${option.voteCount} votos, ${percentage}%`}
                className={cn(
                  "relative w-full overflow-hidden rounded-[var(--radius-md-token)] border px-4 py-3 text-left transition-all duration-300 ease-out",
                  isActive
                    ? "border-[var(--moss)]/50 bg-[var(--moss)]/5 shadow-[0_0_15px_rgba(152,190,92,0.1)] ring-1 ring-[var(--moss)]/20"
                    : "border-[var(--border-subtle)] bg-[var(--bg-deep)] hover:border-[var(--border-moss)]/40 hover:bg-[var(--bg-surface)]"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-[var(--radius-md-token)] transition-all duration-700 ease-out",
                    isActive
                      ? "bg-[var(--moss)]/25"
                      : "bg-[rgba(255,255,255,0.06)]"
                  )}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${option.text}: ${percentage}%`}
                />

                <span className="relative flex items-center justify-between gap-3">
                  <span className={cn(
                    "flex items-center gap-2 text-sm font-semibold transition-colors",
                    isActive ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                  )}>
                    {option.text}
                    {isActive && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--moss)] animate-in zoom-in spin-in-12 duration-300" />
                    )}
                  </span>
                  <span className={cn(
                    "text-xs transition-colors",
                    isActive ? "text-[var(--moss)] font-medium" : "text-[var(--text-muted)]"
                  )}>
                    {option.voteCount} · {percentage}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="body-small text-[var(--text-muted)]">
          {totalVotes} voto(s) registados. Podes trocar o teu voto enquanto a
          sondagem estiver ativa.
        </p>
      </div>
    </section>
  );
}
