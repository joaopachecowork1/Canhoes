"use client";

import { Suspense, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AsyncStatusCard } from "@/components/ui/async-status-card";
import { Button } from "@/components/ui/button";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { useAdminBootstrap } from "@/hooks/useAdminBootstrap";
import { useEventOverview } from "@/hooks/useEventOverview";
import { useAdminProposals } from "./hooks/useAdminProposals";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { ApiError } from "@/lib/api/canhoesClient";
import { adminRepo } from "@/lib/repositories/adminRepo";

import { ADMIN_SECTIONS, type AdminSectionId } from "./adminSections";
import { buildAdminSectionContent } from "./adminSectionContent";
import { AdminStateMessage } from "./layout/AdminStateMessage";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "./adminContentUi";
import type { EventActiveContextDto } from "@/lib/api/types";

function getAdminErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    return getErrorMessage(error, "Não foi possível carregar o admin.");
  }
  if (error instanceof Error) return error.message || "Não foi possível carregar o admin.";
  return "Não foi possível carregar o admin.";
}

type CanhoesAdminModuleProps = {
    section: AdminSectionId;
    initialEventId?: string | null;
    initialContext?: EventActiveContextDto | null;
};

const LOADING_FALLBACK = (
    <AsyncStatusCard
        label="A abrir seccão do admin"
        hint="A preparar os dados e o layout desta área."
        timeoutHint="Se esta seccão não abrir, recarrega a página para recuperar o admin."
        actionLabel="Recarregar"
        onAction={() => globalThis.location.reload()}
    />
);

export default function CanhoesAdminModule({
    section,
    initialEventId,
    initialContext,
}: Readonly<CanhoesAdminModuleProps>) {
    const { event: activeEvent, refresh: refreshOverview } = useEventOverview(initialContext);
    const queryClient = useQueryClient();
    const resolvedEventId = activeEvent?.id ?? initialEventId ?? null;
    const {
        error,
        events,
        loading: bootstrapLoading,
        state: eventState,
        summary,
    } = useAdminBootstrap(resolvedEventId);

    const {
        categoryProposals,
        measureProposals,
        isLoading: proposalsLoading,
    } = useAdminProposals(resolvedEventId);

    const { data: pendingNominationCount = 0, isLoading: pendingNominationCountLoading } =
        useQuery({
            enabled: !!resolvedEventId,
            queryFn: () => adminRepo.getNominationsPaged(resolvedEventId!, 0, 1000, "pending"),
            queryKey: ["canhoes", "admin", "nominations", "summary", "pending", resolvedEventId],
            refetchOnWindowFocus: false,
            select: (data) => data.total,
            staleTime: 1000 * 60 * 2,
        });

    const loading = bootstrapLoading || proposalsLoading || pendingNominationCountLoading;
    const totalCategories = eventState?.counts.categoryCount ?? summary?.officialResultsCategoriesCount ?? 0;

    const handleRefresh = useCallback(async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["adminBootstrap", resolvedEventId] }),
            queryClient.invalidateQueries({ queryKey: ["admin", "proposals", "categories", "pending", resolvedEventId] }),
            queryClient.invalidateQueries({ queryKey: ["admin", "proposals", "measures", "pending", resolvedEventId] }),
            queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "nominations", "summary", "pending", resolvedEventId] }),
            queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "categories", resolvedEventId] }),
            queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "votes", "audit", resolvedEventId] }),
            queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "members", resolvedEventId, 0, 50] }),
            queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "secret-santa-state", resolvedEventId] }),
            refreshOverview(),
        ]);
    }, [resolvedEventId, queryClient, refreshOverview]);

    const dashboardError = getAdminErrorMessage(error);
    const sectionContent = buildAdminSectionContent({
      categoriesCount: totalCategories,
      categoryProposals,
      events,
      eventId: activeEvent?.id ?? null,
      eventState,
      handleRefresh,
      isLoading: loading,
      measureProposals,
      pendingNominationCount,
      summary: {
        memberCount: summary?.membersTotal ?? 0,
        officialResultsCategoryCount: summary?.officialResultsCategoriesCount ?? 0,
      },
    });

    useEffect(() => {
        if (!error) return;

        if (error instanceof ApiError) {
            logFrontendError("Admin.bootstrap", error, {
                endpoint: "admin-bootstrap",
                status: error.status,
                details: error.details,
            });
            return;
        }
        logFrontendError("Admin.bootstrap", error);
    }, [error]);

    const activeSectionMeta = ADMIN_SECTIONS.find((item) => item.id === section);

    return (
        <div className="space-y-5">
            {dashboardError ? (
                <AdminStateMessage
                    variant="panel"
                    tone="error"
                    action={
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleRefresh()}
                            className={ADMIN_OUTLINE_BUTTON_CLASS}
                        >
                            Tentar novamente
                        </Button>
                    }
                >
                    <div className="space-y-1">
                        <p className="font-semibold text-[var(--ink-primary)]">
                            Erro ao carregar o admin
                        </p>
                        <p>{dashboardError}</p>
                        <p className="text-[var(--ink-muted)]">Atualiza a edição ou confirma o backend antes de continuar a moderação.</p>
                    </div>
                </AdminStateMessage>
            ) : null}

            <SectionBoundary
                title={`Erro ao abrir ${activeSectionMeta?.label ?? "esta seccão"}`}
                description="Esta seccão do admin falhou ao renderizar, mas o resto do painel continua disponível."
                onRetry={() => void handleRefresh()}
                resetKey={section}
            >
                <Suspense fallback={LOADING_FALLBACK}>
                    {sectionContent[section]()}
                </Suspense>
            </SectionBoundary>
        </div>
    );
}
