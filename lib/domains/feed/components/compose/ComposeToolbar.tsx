"use client";

import { BarChart3, ImagePlus, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { MAX_MEDIA_FILES } from "../../rules/composeRules";

const copy = messages.feed.compose;

const IDLE_TOOL_CLASS = "border-[rgba(255,255,255,0.18)] bg-[rgba(18,23,12,0.72)] text-[var(--ink-primary)]";
const TOOL_CLASS =
  "canhoes-tap flex h-11 w-11 items-center justify-center rounded-xl border disabled:cursor-not-allowed disabled:opacity-50";

/** The bottom bar of the compose sheet: add images, toggle the poll, publish. */
export function ComposeToolbar({
  canSubmit,
  fileCount,
  isPollEnabled,
  isSubmitting,
  onPickImages,
  onSubmit,
  onTogglePoll,
}: Readonly<{
  canSubmit: boolean;
  fileCount: number;
  isPollEnabled: boolean;
  isSubmitting: boolean;
  onPickImages: () => void;
  onSubmit: () => void;
  onTogglePoll: () => void;
}>) {
  const SubmitIcon = isSubmitting ? Loader2 : Send;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[rgba(10,14,8,0.98)] px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPickImages}
          title={copy.mediaLabel}
          aria-label={copy.mediaLabel}
          disabled={isSubmitting || fileCount >= MAX_MEDIA_FILES}
          className={cn(
            TOOL_CLASS,
            "relative",
            fileCount > 0
              ? "border-[var(--moss)] bg-[var(--moss)] text-[var(--ink-primary)] shadow-[var(--glow-green-sm)]"
              : IDLE_TOOL_CLASS
          )}
        >
          <ImagePlus className="h-4 w-4" />
          {fileCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-fire)] text-[9px] font-bold text-white">
              {fileCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onTogglePoll}
          title={copy.pollLabel}
          aria-label={copy.pollLabel}
          disabled={isSubmitting}
          className={cn(
            TOOL_CLASS,
            isPollEnabled
              ? "border-[var(--color-brown)] bg-[var(--color-brown)] text-[var(--ink-primary)] shadow-[var(--shadow-card)]"
              : IDLE_TOOL_CLASS
          )}
        >
          <BarChart3 className="h-4 w-4" />
        </button>
      </div>

      <Button onClick={onSubmit} disabled={!canSubmit} className="min-w-[132px]">
        <SubmitIcon className={cn("h-4 w-4", isSubmitting && "animate-spin")} />
        {copy.submit}
      </Button>
    </div>
  );
}
