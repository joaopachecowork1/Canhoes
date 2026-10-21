"use client";

import { BarChart3, ImagePlus, Loader2, Send, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { MAX_MEDIA_FILES } from "../../rules/composeRules";

const copy = messages.feed.compose;

const IDLE_TOOL_CLASS = "border-[var(--color-veil)]/18 bg-[var(--color-panel)]/72 text-[var(--ink-primary)]";
const TOOL_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-xl border disabled:cursor-not-allowed disabled:opacity-50";

type ToolbarActionsProps = {
  fileCount: number;
  isPollEnabled: boolean;
  isAdmin?: boolean;
  isGatheringEnabled?: boolean;
  isSubmitting: boolean;
  onPickImages: () => void;
  onTogglePoll: () => void;
  onToggleGathering?: () => void;
};

function ToolbarActions({
  fileCount,
  isPollEnabled,
  isAdmin,
  isGatheringEnabled,
  isSubmitting,
  onPickImages,
  onTogglePoll,
  onToggleGathering,
}: Readonly<ToolbarActionsProps>) {
  return (
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
            ? "border-[var(--moss)] bg-[var(--moss)] text-[var(--on-moss)] shadow-[var(--glow-green-sm)]"
            : IDLE_TOOL_CLASS,
        )}
      >
        <ImagePlus className="h-4 w-4" />
        {fileCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--person-amber)] text-xs font-bold text-[var(--text-primary)]">
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
            ? "border-[var(--color-text-muted)] bg-[var(--color-text-muted)] text-[var(--ink-primary)] shadow-[var(--shadow-card)]"
            : IDLE_TOOL_CLASS,
        )}
      >
        <BarChart3 className="h-4 w-4" />
      </button>

      {isAdmin ? (
        <button
          type="button"
          onClick={onToggleGathering}
          title={copy.gatheringLabel}
          aria-label={copy.gatheringLabel}
          disabled={isSubmitting}
          className={cn(
            TOOL_CLASS,
            isGatheringEnabled
              ? "border-[var(--moss-glow)] bg-[var(--moss-glow)] text-black shadow-[var(--glow-green-sm)]"
              : IDLE_TOOL_CLASS,
          )}
        >
          <UtensilsCrossed className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/** A barra inferior da folha de publicação: adicionar imagens, ativar a sondagem e publicar. */
export function ComposeToolbar({
  canSubmit,
  isSubmitting,
  onSubmit,
  ...actionProps
}: Readonly<{
  canSubmit: boolean;
  fileCount: number;
  isPollEnabled: boolean;
  isAdmin?: boolean;
  isGatheringEnabled?: boolean;
  isSubmitting: boolean;
  onPickImages: () => void;
  onSubmit: () => void;
  onTogglePoll: () => void;
  onToggleGathering?: () => void;
}>) {
  const SubmitIcon = isSubmitting ? Loader2 : Send;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-veil)]/10 bg-[var(--color-panel)]/98 px-4 py-3">
      <ToolbarActions isSubmitting={isSubmitting} {...actionProps} />

      <Button onClick={onSubmit} disabled={!canSubmit} className="min-w-[132px]">
        <SubmitIcon className={cn("h-4 w-4", isSubmitting && "animate-spin")} />
        {copy.submit}
      </Button>
    </div>
  );
}
