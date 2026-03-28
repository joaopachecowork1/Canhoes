"use client";

import React from "react";

import type { HubPollDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function PollBox({
  poll,
  onVote,
}: Readonly<{
  poll: HubPollDto;
  onVote: (optionId: string) => void;
}>) {
  const totalVotes = Math.max(0, poll.totalVotes || 0);

  return (
    <section className="rounded-[var(--radius-lg-token)] border border-[var(--color-moss)]/15 bg-[var(--color-bg-surface)] p-4 sm:p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="editorial-kicker">Votacao</p>
          <h3 className="heading-3 text-[var(--color-text-primary)]">
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
                className={cn(
                  "relative w-full overflow-hidden rounded-[var(--radius-md-token)] border px-4 py-3 text-left transition-colors",
                  isActive
                    ? "border-[var(--color-moss)]/35 bg-[var(--color-bg-card)] shadow-[var(--shadow-card)]"
                    : "border-[var(--color-beige-dark)]/25 bg-[var(--color-bg-card)] hover:border-[var(--color-brown)]/30"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-[var(--radius-md-token)]",
                    isActive
                      ? "bg-[var(--color-moss)]/18"
                      : "bg-[var(--color-brown)]/10"
                  )}
                  style={{ width: `${percentage}%` }}
                />

                <span className="relative flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {option.text}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {option.voteCount} · {percentage}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="body-small text-[var(--color-text-muted)]">
          {totalVotes} voto(s) registados. Podes trocar o teu voto enquanto a
          fase estiver ativa.
        </p>
      </div>
    </section>
  );
}
