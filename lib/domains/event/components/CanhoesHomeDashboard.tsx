"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";

import type { EventActiveContextDto } from "@/lib/api/types";
import type { CanhoesModule } from "@/lib/modules";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { pickDashboardModules } from "../rules/homeDashboard";

const copy = messages.event.CanhoesHomeDashboard;
const DASHBOARD_COLLAPSED_STORAGE_KEY = "canhoes:home-dashboard-collapsed";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]";

const preferenceListeners = new Set<() => void>();

function subscribeToPreference(onChange: () => void) {
  preferenceListeners.add(onChange);
  globalThis.addEventListener("storage", onChange);
  return () => {
    preferenceListeners.delete(onChange);
    globalThis.removeEventListener("storage", onChange);
  };
}

// When storage is refused (private windows), the choice lives here for the rest of the visit.
let unsavedCollapsed: boolean | null = null;

function readCollapsed() {
  if (unsavedCollapsed !== null) return unsavedCollapsed;
  try {
    return globalThis.localStorage.getItem(DASHBOARD_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Collapsed or not, remembered in this browser; the server render is always expanded. */
function useCollapsedPreference() {
  const isCollapsed = useSyncExternalStore(subscribeToPreference, readCollapsed, () => false);

  const handleToggle = () => {
    try {
      globalThis.localStorage.setItem(DASHBOARD_COLLAPSED_STORAGE_KEY, String(!isCollapsed));
    } catch {
      unsavedCollapsed = !isCollapsed;
    }
    preferenceListeners.forEach((notify) => notify());
  };

  return { isCollapsed, handleToggle };
}

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
      <ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--moss-glow)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
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
            className={cn(
              "flex min-h-20 items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)]",
              FOCUS_RING,
              module.key === "secretSanta" && "text-[var(--text-primary)]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-[var(--moss-glow)]" aria-hidden />
            <span className="min-w-0 truncate">{module.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CanhoesHomeDashboard({ context }: Readonly<{ context: EventActiveContextDto | null }>) {
  const { isCollapsed, handleToggle } = useCollapsedPreference();
  const { nextStep, shortcuts } = pickDashboardModules(context?.overview.modules ?? {}, context?.overview.activePhase?.type);
  const ToggleIcon = isCollapsed ? ChevronDown : ChevronUp;

  return (
    <section aria-label={copy.sectionLabel} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          {isCollapsed ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{copy.collapsedHint}</p>
          ) : (
            <h1 id="dashboard-title" className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {copy.title}
            </h1>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          aria-controls="current-edition-actions"
          aria-expanded={!isCollapsed}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
            FOCUS_RING,
          )}
        >
          <ToggleIcon className="h-4 w-4" aria-hidden />
          {isCollapsed ? copy.show : copy.hide}
        </button>
      </div>

      <div id="current-edition-actions" hidden={isCollapsed} className="space-y-3">
        <NextStepCard module={nextStep} />
        <ShortcutGrid modules={shortcuts} />
      </div>
    </section>
  );
}
