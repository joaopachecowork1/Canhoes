"use client";

import { Loader2, Sparkles } from "lucide-react";

import type { EventOverviewDto, EventSummaryDto } from "@/lib/api/types";
import { getPhaseLabel } from "@/lib/canhoesEvent";

/** Pill in the header with the event name and its active phase. */
export function CanhoesPhaseHud({
  event,
  isLoading = false,
  overview,
}: Readonly<{
  event?: EventSummaryDto | null;
  isLoading?: boolean;
  overview?: EventOverviewDto | null;
}>) {
  if (isLoading) {
    return (
      <div className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[var(--bg-paper)] px-2.5 py-1 text-[var(--text-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--moss)]" />
        <span className="text-xs font-medium">
          A abrir
        </span>
      </div>
    );
  }

  if (!event || !overview) return null;

  const phaseLabel = getPhaseLabel(overview.activePhase?.type);

  return (
    <div className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-[var(--bg-paper)] px-2.5 py-1">
      <Sparkles className="h-3.5 w-3.5 text-[var(--moss-glow)]" />
      <span className="text-xs text-[var(--text-muted)]">
        {event.name}
      </span>
      <span className="text-xs font-semibold text-[var(--color-text-primary)]">
        {phaseLabel}
      </span>
    </div>
  );
}
