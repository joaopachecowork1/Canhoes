"use client";

import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { getPhaseLabel } from "@/lib/canhoesEvent";

import type { AdminSectionId } from "./adminSections";

type AdminMobileSummaryProps = {
  activeEvent: { id: string; name: string } | null;
  eventPhase: string | null;
  isLoading: boolean;
  pendingNominationCount: number;
  section: AdminSectionId;
  summary: {
    memberCount: number;
    pendingCategoryProposalCount: number;
    pendingMeasureProposalCount: number;
    totalCategories: number;
    totalNominees: number;
    visibleModuleCount: number;
  };
};

/** Compact mobile-only summary of the active event and its pending work. */
export const AdminMobileSummary = memo(function AdminMobileSummary({
  activeEvent,
  eventPhase,
  isLoading,
  pendingNominationCount,
  section,
  summary,
}: Readonly<AdminMobileSummaryProps>) {
  if (isLoading || !activeEvent || section === "configuracoes") {
    return null;
  }

  const pendingTotal =
    pendingNominationCount +
    summary.pendingCategoryProposalCount +
    summary.pendingMeasureProposalCount;

  return (
    <div className="sm:hidden space-y-2">
      <div className="text-[var(--color-text-primary)] overflow-hidden rounded-[var(--radius-lg-token)] border border-[var(--border-paper)] bg-[var(--bg-paper)] px-3 py-3 shadow-[var(--shadow-paper)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="editorial-kicker text-[var(--sand)] text-[0.6rem]">Pendentes</p>
            <p className="mt-0.5 text-2xl font-extrabold text-[var(--ink-primary)] tabular-nums">
              {pendingTotal}
            </p>
            <p className="mt-1 text-[0.68rem] leading-4 text-[var(--ink-secondary)]">
              {pendingNominationCount} nomeações, {summary.pendingCategoryProposalCount} categorias,{" "}
              {summary.pendingMeasureProposalCount} medidas.
            </p>
          </div>
        </div>
      </div>

      <CollapsibleMobileMetrics
        phase={eventPhase}
        memberCount={summary.memberCount}
        moduleCount={summary.visibleModuleCount}
        totalCategories={summary.totalCategories}
        totalNominees={summary.totalNominees}
      />
    </div>
  );
});

function CollapsibleMobileMetrics({
  phase,
  memberCount,
  moduleCount,
  totalCategories,
  totalNominees,
}: Readonly<{
  phase: string | null;
  memberCount: number;
  moduleCount: number;
  totalCategories: number;
  totalNominees: number;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--border-paper)] bg-[var(--bg-paper)]">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="canhoes-tap flex w-full min-h-[44px] items-center justify-between px-3 py-2 text-xs text-[var(--ink-muted)]"
      >
        <span>Detalhes do evento</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--border-paper-soft)] px-3 py-2">
          <MetricTile label="Fase" value={phase ? getPhaseLabel(phase) : "—"} />
          <MetricTile label="Membros" value={String(memberCount)} />
          <MetricTile label="Módulos" value={String(moduleCount)} />
          <MetricTile label="Categorias" value={String(totalCategories)} />
          <MetricTile label="Nomeações" value={String(totalNominees)} />
          <MetricTile label="Edição" value={memberCount > 0 ? "Ativa" : "—"} />
        </div>
      ) : null}
    </div>
  );
}

function MetricTile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-[var(--border-paper-soft)] bg-[var(--bg-paper-soft)] px-2 py-1.5">
      <p className="text-[0.55rem] leading-none text-[var(--ink-muted)]">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--ink-primary)]">{value}</p>
    </div>
  );
}
