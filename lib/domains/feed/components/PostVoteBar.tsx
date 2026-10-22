"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";

import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

const copy = messages.feed.PostVoteBar;

/** A cor da pontuação conforme o utilizador tenha votado a favor, contra ou não tenha votado. */
function getScoreClass(isUpvoted: boolean, isDownvoted: boolean) {
  if (isUpvoted) return "text-[var(--moss-glow)] font-black";
  if (isDownvoted) return "text-[var(--color-danger)] font-black";
  return "text-[var(--color-text-primary)]";
}

/** Voto a favor, pontuação (gostos menos votos contra) e voto contra de um post. */
export function PostVoteBar({
  isDownvoted,
  isUpvoted,
  onDownvote,
  onUpvote,
  score,
}: Readonly<{
  isDownvoted: boolean;
  isUpvoted: boolean;
  onDownvote: () => void;
  onUpvote: () => void;
  score: number;
}>) {
  return (
    <div className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-base)]/85 p-1 gap-1 shadow-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
      <button
        type="button"
        onClick={onUpvote}
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]",
          isUpvoted
            ? "bg-[var(--moss)]/25 text-[var(--moss-glow)] ring-2 ring-[var(--moss-glow)] shadow-[0_0_14px_rgba(95,227,154,0.35)] scale-105"
            : "bg-[var(--color-veil)]/[0.04] text-[var(--color-text-primary)]/80 hover:bg-[var(--moss)]/20 hover:text-[var(--moss-glow)] hover:border-[var(--moss)]/40 hover:scale-105",
        )}
        aria-label={isUpvoted ? copy.removeUpvote : copy.upvote}
      >
        <ArrowBigUp
          className={cn(
            "size-5 transition-transform stroke-[2]",
            isUpvoted ? "fill-[var(--moss-glow)] text-[var(--moss-glow)]" : "text-current",
          )}
        />
      </button>

      <span
        key={score}
        className={cn(
          "inline-block min-w-[2.25rem] px-1 text-center font-mono text-sm font-bold tabular-nums tracking-tight select-none animate-score-bounce",
          getScoreClass(isUpvoted, isDownvoted),
        )}
      >
        {score}
      </span>

      <button
        type="button"
        onClick={onDownvote}
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]",
          isDownvoted
            ? "bg-[var(--color-danger)]/25 text-[var(--color-danger)] ring-2 ring-[var(--color-danger)] shadow-[0_0_14px_rgba(255,107,107,0.35)] scale-105"
            : "bg-[var(--color-veil)]/[0.04] text-[var(--color-text-primary)]/80 hover:bg-[var(--color-danger)]/20 hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]/40 hover:scale-105",
        )}
        aria-label={isDownvoted ? copy.removeDownvote : copy.downvote}
      >
        <ArrowBigDown
          className={cn(
            "size-5 transition-transform stroke-[2]",
            isDownvoted ? "fill-[var(--color-danger)] text-[var(--color-danger)]" : "text-current",
          )}
        />
      </button>
    </div>
  );
}
