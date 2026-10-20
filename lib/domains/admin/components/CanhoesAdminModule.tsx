"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAdminBootstrap } from "@/lib/domains/admin/hooks/useAdminBootstrap";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { ApiError } from "@/lib/api/canhoesClient";
import type { EventActiveContextDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";

import type { AdminSectionId } from "./adminSections";
import { useAdminProposals } from "../hooks/useAdminProposals";
import { AdminContentSection } from "./layout/AdminContentSection";
import { AdminStateMessage } from "./layout/AdminStateMessage";
import { AdminControlCenter } from "./event/AdminControlCenter";
import { AdminMembersSection } from "./users/AdminMembersSection";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.admin.CanhoesAdminModule;

type CanhoesAdminModuleProps = {
  section: AdminSectionId;
  initialEventId?: string | null;
  initialContext?: EventActiveContextDto | null;
};

function usePendingNominationCount(eventId: string | null) {
  return useQuery({
    enabled: !!eventId,
    queryFn: () => adminRepo.getNominationsPaged(eventId ?? "", 0, 1, "pending"),
    queryKey: queryKeys.admin.nominationsPendingCount(eventId),
    refetchOnWindowFocus: false,
    select: (data) => data.total,
    staleTime: 1000 * 60 * 2,
  });
}

function useLogBootstrapError(error: unknown) {
  useEffect(() => {
    if (!error) return;
    if (error instanceof ApiError) {
      logFrontendError("Admin.bootstrap", error, { endpoint: "admin-bootstrap", status: error.status, details: error.details });
      return;
    }
    logFrontendError("Admin.bootstrap", error);
  }, [error]);
}

function AdminLoadError({ error, onRetry }: Readonly<{ error: unknown; onRetry: () => void }>) {
  return (
    <AdminStateMessage
      variant="panel"
      tone="error"
      action={
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          {messages.common.retry}
        </Button>
      }
    >
      <div className="space-y-1">
        <p className="font-semibold text-[var(--ink-primary)]">{copy.errorTitle}</p>
        <p>{getErrorMessage(error, copy.loadError)}</p>
        <p className="text-[var(--ink-muted)]">{copy.errorHint}</p>
      </div>
    </AdminStateMessage>
  );
}

type Bootstrap = ReturnType<typeof useAdminBootstrap>;
type Proposals = ReturnType<typeof useAdminProposals>;

function AdminSectionView({
  bootstrap,
  content,
  eventId,
  loading,
  onRefresh,
  section,
}: Readonly<{
  bootstrap: Bootstrap;
  content: Pick<Proposals, "categoryProposals" | "measureProposals"> & { pendingNominationCount: number };
  eventId: string | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  section: AdminSectionId;
}>) {
  if (section === "membros") return <AdminMembersSection eventId={eventId} onUpdate={onRefresh} loading={loading} />;
  if (section === "configuracoes") {
    return <AdminControlCenter eventId={eventId} events={bootstrap.events} loading={loading} onRefresh={onRefresh} state={bootstrap.state} />;
  }

  const { summary } = bootstrap;
  return (
    <AdminContentSection
      categoryProposals={content.categoryProposals}
      categoriesCount={summary?.categoriesTotal ?? 0}
      eventId={eventId}
      memberCount={summary?.membersTotal ?? 0}
      officialResultsCount={summary?.officialResultsCategoriesCount ?? 0}
      pendingNominationCount={content.pendingNominationCount}
      loading={loading}
      measureProposals={content.measureProposals}
      onUpdate={onRefresh}
    />
  );
}

export default function CanhoesAdminModule({ section, initialEventId, initialContext }: Readonly<CanhoesAdminModuleProps>) {
  const { event: activeEvent, refresh: refreshOverview } = useEventOverview(initialContext);
  const queryClient = useQueryClient();
  const resolvedEventId = activeEvent?.id ?? initialEventId ?? null;
  const eventId = activeEvent?.id ?? null;
  const bootstrap = useAdminBootstrap(resolvedEventId);
  const { categoryProposals, measureProposals, isLoading: proposalsLoading } = useAdminProposals(resolvedEventId);
  const { data: pendingNominationCount = 0, isLoading: pendingCountLoading } = usePendingNominationCount(resolvedEventId);
  const loading = bootstrap.loading || proposalsLoading || pendingCountLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      ...queryKeys.admin.afterWrite(resolvedEventId).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      refreshOverview(),
    ]);
  }, [resolvedEventId, queryClient, refreshOverview]);

  useLogBootstrapError(bootstrap.error);

  return (
    <div className="space-y-5">
      <CanhoesModuleHeader module="admin" title={copy.title} description={copy.description} />
      {bootstrap.error ? <AdminLoadError error={bootstrap.error} onRetry={() => void handleRefresh()} /> : null}

      <AdminSectionView
        section={section}
        eventId={eventId}
        loading={loading}
        onRefresh={handleRefresh}
        bootstrap={bootstrap}
        content={{ categoryProposals, measureProposals, pendingNominationCount }}
      />
    </div>
  );
}
