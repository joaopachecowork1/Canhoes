"use client";

import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { AdminNomineeDto } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { getNomineeStatusBadgeVariant } from "@/components/modules/canhoes/CanhoesModuleParts";
import { AdminStateMessage } from "@/lib/domains/admin/components/layout/AdminStateMessage";
import { adminCopy } from "@/lib/canhoesCopy";
import { adminRepo } from "@/lib/repositories/adminRepo";

import { AdminCollapsibleSection } from "../layout/AdminCollapsibleSection";

type AdminDashboardProps = {
  eventId: string | null;
  loading: boolean;
  pendingCategoryProposalsCount: number;
  pendingMeasureProposalsCount: number;
  pendingNominationCount: number;
};

const PENDING_BADGE_LABELS = [
  { key: "nominees", suffix: "nomeações pendentes" },
  { key: "categories", suffix: "propostas de categoria" },
  { key: "measures", suffix: "medidas propostas" },
] as const;

function PendingReviewBadges({
  nomineesCount,
  categoryProposalsCount,
  measureProposalsCount,
}: Readonly<{
  nomineesCount: number;
  categoryProposalsCount: number;
  measureProposalsCount: number;
}>) {
  const items = {
    nominees: nomineesCount,
    categories: categoryProposalsCount,
    measures: measureProposalsCount,
  } as const;

  return (
    <>
      {PENDING_BADGE_LABELS.map((item) =>
        items[item.key] > 0 ? (
          <Badge key={item.key} variant="secondary">
            {items[item.key]} {item.suffix}
          </Badge>
        ) : null
      )}
    </>
  );
}

export function AdminDashboard({
  eventId,
  loading,
  pendingCategoryProposalsCount,
  pendingMeasureProposalsCount,
  pendingNominationCount,
}: Readonly<AdminDashboardProps>) {
  const recentNomineesQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getNominationsPaged(eventId!, 0, 5),
    queryKey: ["canhoes", "admin", "recent-nominees", eventId],
    refetchOnWindowFocus: false,
    select: (page) => page.nominations,
    staleTime: 1000 * 60 * 2,
  });

  const pendingReviews = pendingNominationCount + pendingCategoryProposalsCount + pendingMeasureProposalsCount;

  const recentNominees = recentNomineesQuery.data ?? [];

  return (
    <div className="space-y-4">
      {!loading && pendingReviews > 0 ? (
        <section className="text-[var(--color-text-primary)] rounded-[var(--radius-lg-token)] border border-[rgba(224,90,58,0.18)] bg-[var(--bg-paper)] px-4 py-4 text-[var(--ink-primary)] shadow-[var(--shadow-paper)]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" />
              <span className="editorial-kicker text-[var(--danger)]">{adminCopy.dashboard.queueKicker}</span>
            </div>

            <div className="space-y-2">
              <h3 className="heading-3 text-[var(--ink-primary)]">{adminCopy.dashboard.queueTitle}</h3>
              <div className="flex flex-wrap gap-2">
                <PendingReviewBadges
                  nomineesCount={pendingNominationCount}
                  categoryProposalsCount={pendingCategoryProposalsCount}
                  measureProposalsCount={pendingMeasureProposalsCount}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {loading || recentNomineesQuery.isLoading ? <AdminStateMessage variant="panel">A carregar nomeações recentes...</AdminStateMessage> : null}

      {!loading && recentNomineesQuery.error ? (
        <AdminStateMessage tone="warning" variant="panel">
          Não foi possível carregar as nomeações recentes.
        </AdminStateMessage>
      ) : null}

      {!loading && !recentNomineesQuery.isLoading && recentNominees.length > 0 ? (
        <AdminCollapsibleSection
          kicker={adminCopy.dashboard.recentKicker}
          title={adminCopy.dashboard.recentTitle}
          count={recentNominees.length}
        >
          {recentNominees.map((nominee: AdminNomineeDto) => (
            <article
              key={nominee.id}
              className="rounded-[var(--radius-md-token)] border border-[var(--border-paper)] bg-[var(--bg-paper-soft)] px-4 py-4 text-[var(--ink-primary)] shadow-none"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-[var(--ink-primary)]">
                    {nominee.title}
                  </p>
                  <p className="truncate text-xs text-[var(--ink-secondary)]">
                    Submetida por {nominee.submittedByName}
                  </p>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {new Date(nominee.createdAtUtc).toLocaleString("pt-PT", {
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>

                <Badge
                  variant={
                    nominee.status === "approved"
                      ? "default"
                      : getNomineeStatusBadgeVariant(nominee.status)
                  }
                >
                  {nominee.status}
                </Badge>
              </div>
            </article>
          ))}
        </AdminCollapsibleSection>
      ) : null}
    </div>
  );
}
