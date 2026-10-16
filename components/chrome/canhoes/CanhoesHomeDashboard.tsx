"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

import type { EventActiveContextDto } from "@/lib/api/types";
import { CANHOES_MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

type CanhoesHomeDashboardProps = {
  context: EventActiveContextDto | null;
};

const PHASE_MODULES: Record<string, string> = {
  DRAW: "secretSanta",
  PROPOSALS: "nominees",
  VOTING: "voting",
  RESULTS: "gala",
};

const DASHBOARD_COLLAPSED_STORAGE_KEY = "canhoes:home-dashboard-collapsed";

export function CanhoesHomeDashboard({
  context,
}: Readonly<CanhoesHomeDashboardProps>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const modules = context?.overview.modules ?? {};
  const phaseModuleKey = context?.overview.activePhase?.type
    ? PHASE_MODULES[context.overview.activePhase.type]
    : undefined;
  const activeModule =
    CANHOES_MODULES.find((module) => module.key === phaseModuleKey && modules[module.key]) ??
    CANHOES_MODULES.find((module) => module.key === "wishlist" && modules[module.key]);
  const secondaryModules = CANHOES_MODULES.filter(
    (module) => module.key !== "feed" && module.key !== activeModule?.key && modules[module.key],
  ).slice(0, 3);
  const ActiveIcon = activeModule?.icon;

  useEffect(() => {
    setIsCollapsed(globalThis.localStorage.getItem(DASHBOARD_COLLAPSED_STORAGE_KEY) === "true");
  }, []);

  const handleToggle = () => {
    setIsCollapsed((current) => {
      const next = !current;
      globalThis.localStorage.setItem(DASHBOARD_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <section aria-label="Edição atual" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--moss-glow)]">Edição atual</p>
          {isCollapsed ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">Atalhos ocultos</p>
          ) : (
            <h1 id="dashboard-title" className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Olá, o que fazemos agora?
            </h1>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          aria-controls="current-edition-actions"
          aria-expanded={!isCollapsed}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden />
              Mostrar
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden />
              Esconder
            </>
          )}
        </button>
      </div>

      <div
        id="current-edition-actions"
        hidden={isCollapsed}
        className="space-y-3"
      >
        {activeModule ? (
          <Link
            href={activeModule.href}
            className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--moss)]/20 px-4 py-4 transition-colors hover:bg-[var(--moss)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--moss)] text-[var(--text-primary)]">
                {ActiveIcon ? <ActiveIcon className="h-5 w-5" aria-hidden /> : null}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--moss-glow)]">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Próximo passo
                </span>
                <span className="mt-1 block truncate text-lg font-semibold text-[var(--text-primary)]">
                  {activeModule.label}
                </span>
                <span className="block truncate text-sm text-[var(--text-secondary)]">{activeModule.description}</span>
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--moss-glow)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-4 py-4">
            <p className="text-base font-semibold text-[var(--text-primary)]">O mural está pronto.</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Partilha uma atualização com o grupo.</p>
          </div>
        )}

        {secondaryModules.length > 0 ? (
          <nav aria-label="Atalhos da edição" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {secondaryModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.key}
                  href={module.href}
                  className={cn(
                    "flex min-h-20 items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]",
                    module.key === "secretSanta" && "text-[var(--text-primary)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--moss-glow)]" aria-hidden />
                  <span className="min-w-0 truncate">{module.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

    </section>
  );
}
