"use client";

import type { ReactNode } from "react";
import { CalendarClock, Eye, TimerReset, Vote } from "lucide-react";

import { formatEventPhaseLabel } from "@/components/modules/canhoes/CanhoesModuleParts";
import { adminCopy } from "@/lib/canhoesCopy";
import { countOpenModules } from "@/lib/modules";
import type { EventAdminStateDto } from "@/lib/api/types";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { AdminDashboard } from "./AdminDashboard";
import { AdminSectionPanel } from "../adminContentUi";
import { AdminStateMessage } from "../layout/AdminStateMessage";

function AdminOverviewLoadingState() {
  return (
    <AdminSectionPanel>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-5 w-64 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-20 rounded-[var(--radius-md-token)]" />
          <Skeleton className="h-20 rounded-[var(--radius-md-token)]" />
          <Skeleton className="h-20 rounded-[var(--radius-md-token)]" />
          <Skeleton className="h-20 rounded-[var(--radius-md-token)]" />
        </div>
      </div>
    </AdminSectionPanel>
  );
}

type AdminOverviewSectionProps = {
  activeEventName: string | null;
  eventId: string | null;
  loading: boolean;
  pendingCategoryProposalsCount: number;
  pendingMeasureProposalsCount: number;
  pendingNominationCount: number;
  state: EventAdminStateDto | null;
};

export function AdminOverviewSection({
  activeEventName,
  eventId,
  loading,
  pendingCategoryProposalsCount,
  pendingMeasureProposalsCount,
  pendingNominationCount,
  state,
}: Readonly<AdminOverviewSectionProps>) {
  const pendingReviewCount =
    pendingNominationCount +
    pendingCategoryProposalsCount +
    pendingMeasureProposalsCount;

  const visibleModuleCount = countOpenModules(state?.effectiveModules);

  return (
    <div className="space-y-4">
      {loading ? <AdminOverviewLoadingState /> : (
      <AdminSectionPanel>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="editorial-kicker text-[var(--moss)]">Admin</p>
              <h2 className="text-base font-semibold text-[var(--ink-primary)]">
                Painel operacional da edição
              </h2>
              <p className="text-sm leading-6 text-[var(--ink-secondary)]">
                Leitura rápida do evento, da fila e dos sinais principais, sem misturar controlo com conteúdo.
              </p>
            </div>

            <Badge className="border-[var(--border-paper)] bg-[rgba(122,173,58,0.1)] text-[var(--ink-primary)] shadow-none sm:self-start">
              {visibleModuleCount} módulos ativos
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric
              icon={<CalendarClock className="h-4 w-4" />}
              label="Edição ativa"
              value={activeEventName ?? adminCopy.controlStrip.activeEventFallback}
            />
            <OverviewMetric
              icon={<TimerReset className="h-4 w-4" />}
              label="Fase atual"
              value={
                state?.activePhase?.type
                  ? formatEventPhaseLabel(state.activePhase.type)
                  : "Sem fase ativa"
              }
            />
            <OverviewMetric
              icon={<Eye className="h-4 w-4" />}
              label="Módulos visíveis"
              value={`${visibleModuleCount}`}
              tone={visibleModuleCount > 0 ? "highlight" : "default"}
            />
            <OverviewMetric
              icon={<Vote className="h-4 w-4" />}
              label="Fila pendente"
              value={`${pendingReviewCount}`}
              tone={pendingReviewCount > 0 ? "highlight" : "default"}
            />
          </div>
        </div>
      </AdminSectionPanel>
      )}

      {!loading && !state ? (
        <AdminStateMessage variant="panel">{adminCopy.state.noState}</AdminStateMessage>
      ) : null}

      <AdminDashboard
        eventId={eventId}
        loading={loading}
        pendingCategoryProposalsCount={pendingCategoryProposalsCount}
        pendingMeasureProposalsCount={pendingMeasureProposalsCount}
        pendingNominationCount={pendingNominationCount}
      />
    </div>
  );
}

function OverviewMetric({
  icon,
  label,
  tone = "default",
  value,
}: Readonly<{
  icon: ReactNode;
  label: string;
  tone?: "default" | "highlight";
  value: string;
}>) {
  return (
    <div className="rounded-[var(--radius-md-token)] border border-[var(--border-paper)] bg-[var(--bg-paper-soft)] px-3 py-3 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            tone === "highlight"
              ? "flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(122,173,58,0.24)] bg-[rgba(122,173,58,0.12)] text-[var(--ink-primary)]"
              : "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-paper)] bg-[rgba(255,255,255,0.18)] text-[var(--ink-primary)]"
          }
        >
          {icon}
        </span>
        <p className="max-w-[11rem] text-right text-sm font-semibold text-[var(--ink-primary)]">
          {value}
        </p>
      </div>
      <p className="mt-2 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-secondary)]">
        {label}
      </p>
    </div>
  );
}
