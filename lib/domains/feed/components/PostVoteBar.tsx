"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";

import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

const copy = messages.feed.PostVoteBar;

function getScoreClass(isUpvoted: boolean, isDownvoted: boolean) {
  if (isUpvoted) return "text-[var(--moss-glow)]";
  if (isDownvoted) return "text-[var(--color-danger)]";
  return "text-[var(--ink-secondary)]";
}

/** Upvote, score (likes minus downvotes) and downvote for one post. */
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
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onUpvote}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          isUpvoted
            ? "bg-[var(--moss)]/20 text-[var(--moss-glow)] ring-1 ring-[var(--moss)]/40"
            : "text-[var(--text-muted)] hover:bg-[var(--moss)]/10 hover:text-[var(--moss-glow)]",
        )}
        aria-label={isUpvoted ? copy.removeUpvote : copy.upvote}
      >
        <ArrowBigUp
          className={cn("h-5 w-5 transition", isUpvoted && "fill-[var(--moss-glow)] text-[var(--moss-glow)]")}
        />
      </button>

      <span
        className={cn(
          "min-w-[2rem] text-center font-mono text-sm font-bold tabular-nums",
          getScoreClass(isUpvoted, isDownvoted),
        )}
      >
        {score}
      </span>

      <button
        type="button"
        onClick={onDownvote}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          isDownvoted
            ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/40"
            : "text-[var(--text-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]",
        )}
        aria-label={isDownvoted ? copy.removeDownvote : copy.downvote}
      >
        <ArrowBigDown
          className={cn("h-5 w-5 transition", isDownvoted && "fill-[var(--color-danger)] text-[var(--color-danger)]")}
        />
      </button>
    </div>
  );
}
