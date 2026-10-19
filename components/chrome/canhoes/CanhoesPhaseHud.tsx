"use client";

import { Loader2 } from "lucide-react";

import type { EventOverviewDto } from "@/lib/api/types";
import { getPhaseLabel } from "@/lib/canhoesEvent";
import messages from "@/messages/pt.json";

const copy = messages.shell.CanhoesPhaseHud;

const PILL_CLASS =
  "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-[family-name:var(--font-display)] text-sm font-extrabold uppercase tracking-[0.04em]";

/** The active phase as a pitch-green pill in the header. */
export function CanhoesPhaseHud({
  isLoading = false,
  overview,
}: Readonly<{
  isLoading?: boolean;
  overview?: EventOverviewDto | null;
}>) {
  if (isLoading) {
    return (
      <span className={`${PILL_CLASS} bg-[var(--bg-paper)] text-[var(--text-muted)]`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {copy.loading}
      </span>
    );
  }
  if (!overview) return null;

  return <span className={`${PILL_CLASS} bg-[var(--moss)] text-[var(--on-moss)] shadow-[var(--glow-green-sm)]`}>{getPhaseLabel(overview.activePhase?.type)}</span>;
}
