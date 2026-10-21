"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";

import { areaColorVar } from "@/components/chrome/canhoes/canhoesNavigation";
import type { EventActiveContextDto } from "@/lib/api/types";
import type { CanhoesModule } from "@/lib/modules";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { useEventOverview } from "../hooks/useEventOverview";
import { useStoredFlag } from "../hooks/useStoredFlag";
import { pickDashboardModules } from "../rules/homeDashboard";
import { CanhoesWelcomeCard } from "./CanhoesWelcomeCard";

const copy = messages.event.CanhoesHomeDashboard;
const SHORTCUTS_EXPANDED_STORAGE_KEY = "canhoes:home-shortcuts-expanded";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]";

function NextStepCard({ module }: Readonly<{ module: CanhoesModule | undefined }>) {
  if (!module) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-4 py-4">
        <p className="text-base font-semibold text-[var(--text-primary)]">{copy.emptyTitle}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{copy.emptyDescription}</p>
      </div>
    );
  }

  const Icon = module.icon;
  return (
    <Link
      href={module.href}
      className={cn(
        "group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--moss)]/20 px-4 py-4 transition-colors hover:bg-[var(--moss)]/30",
        FOCUS_RING,
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--moss)] text-[var(--on-moss)]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="sr-only">{copy.nextStep}</span>
          <span className="block truncate text-lg font-semibold text-[var(--text-primary)]">{module.label}</span>
          <span className="block truncate text-sm text-[var(--text-secondary)]">{module.description}</span>
        </span>
      </span>
      <ArrowUpRight
        className="h-5 w-5 shrink-0 text-[var(--moss-glow)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

function ShortcutGrid({ modules }: Readonly<{ modules: CanhoesModule[] }>) {
  if (modules.length === 0) return null;

  return (
    <nav aria-label={copy.shortcutsLabel} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {modules.map((module) => {
        const Icon = module.icon;
        return (
          <Link
            key={module.key}
            href={module.href}
            style={{ "--area": areaColorVar(module.key) }}
            className={cn(
              "flex min-h-20 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-3 text-base font-semibold text-[var(--text-primary)] shadow-[var(--shadow-elevation-sm)] transition-colors hover:bg-[var(--page)]",
              FOCUS_RING,
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--area,var(--moss))] text-[var(--on-person)]">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 truncate">{module.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ShortcutsToggleButton({
  isExpanded,
  onToggle,
}: Readonly<{
  isExpanded: boolean;
  onToggle: () => void;
}>) {
  const ToggleIcon = isExpanded ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-controls="current-edition-actions"
      aria-expanded={isExpanded}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
        FOCUS_RING,
      )}
    >
      <ToggleIcon className="h-4 w-4" aria-hidden />
      {isExpanded ? copy.hide : copy.show}
    </button>
  );
}

/** O painel inicial com o próximo passo da fase ativa e os atalhos para outras áreas abertas. */
export function CanhoesHomeDashboard({ context }: Readonly<{ context: EventActiveContextDto | null }>) {
  // Os atalhos repetem a dock e o menu, por isso começam recolhidos; a escolha fica guardada neste browser.
  const [isExpanded, setIsExpanded] = useStoredFlag(SHORTCUTS_EXPANDED_STORAGE_KEY, false);
  const { overview } = useEventOverview(context);
  const activeOverview = overview ?? context?.overview;
  const { nextStep, shortcuts } = pickDashboardModules(
    activeOverview?.modules ?? {},
    activeOverview?.activePhase?.type,
  );
  const hasShortcuts = shortcuts.length > 0;

  return (
    <section aria-label={copy.sectionLabel} className="space-y-3">
      <CanhoesWelcomeCard />
      <div className="flex items-center justify-between gap-3">
        <h1 id="dashboard-title" className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {copy.title}
        </h1>
        {hasShortcuts ? (
          <ShortcutsToggleButton isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
        ) : null}
      </div>

      <NextStepCard module={nextStep} />
      {hasShortcuts ? (
        <div id="current-edition-actions" hidden={!isExpanded}>
          <ShortcutGrid modules={shortcuts} />
        </div>
      ) : null}
    </section>
  );
}
