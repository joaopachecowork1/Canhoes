"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";

import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

const copy = messages.feed.PostVoteBar;

function getScoreClass(isUpvoted: boolean, isDownvoted: boolean) {
  if (isUpvoted) return "text-green-500";
  if (isDownvoted) return "text-red-500";
  return "text-[var(--ink-secondary)]";
}

/** Upvote, score (likes minus downvotes) and downvote for one post. */
export function PostVoteBar({
  isDownvoted,
  isUpvoted,
  onDownvote,
  onUpvote,
  score,
}: Readonly<{ isDownvoted: boolean; isUpvoted: boolean; onDownvote: () => void; onUpvote: () => void; score: number }>) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onUpvote}
        className={cn(
          "canhoes-tap flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          isUpvoted
            ? "bg-green-500/20 text-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
            : "text-[var(--text-muted)] hover:bg-green-500/10 hover:text-green-400"
        )}
        aria-label={isUpvoted ? copy.removeUpvote : copy.upvote}
      >
        <ArrowBigUp className={cn("h-5 w-5 transition-all", isUpvoted && "fill-green-500 text-green-500")} />
      </button>

      <span className={cn("min-w-[2rem] text-center font-mono text-sm font-bold tabular-nums", getScoreClass(isUpvoted, isDownvoted))}>
        {score}
      </span>

      <button
        type="button"
        onClick={onDownvote}
        className={cn(
          "canhoes-tap flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          isDownvoted
            ? "bg-red-500/15 text-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]"
            : "text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
        )}
        aria-label={isDownvoted ? copy.removeDownvote : copy.downvote}
      >
        <ArrowBigDown className={cn("h-5 w-5 transition-all", isDownvoted && "fill-red-500 text-red-500")} />
      </button>
    </div>
  );
}
