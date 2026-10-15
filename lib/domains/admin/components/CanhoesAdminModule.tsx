"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAdminBootstrap } from "@/hooks/useAdminBootstrap";
import { useEventOverview } from "@/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { ApiError } from "@/lib/api/canhoesClient";
import type { EventActiveContextDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";

import type { AdminSectionId } from "./adminSections";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "./adminContentUi";
import { useAdminProposals } from "./hooks/useAdminProposals";
import { AdminContentSection } from "./layout/AdminContentSection";
import { AdminStateMessage } from "./layout/AdminStateMessage";
import { AdminControlCenter } from "./event/AdminControlCenter";
import { AdminMembersSection } from "./users/AdminMembersSection";

type CanhoesAdminModuleProps = {
    section: AdminSectionId;
    initialEventId?: string | null;
    initialContext?: EventActiveContextDto | null;
};

export default function CanhoesAdminModule({
    section,
    initialEventId,
    initialContext,
}: Readonly<CanhoesAdminModuleProps>) {
    const { event: activeEvent, refresh: refreshOverview } = useEventOverview(initialContext);
    const queryClient = useQueryClient();
    const resolvedEventId = activeEvent?.id ?? initialEventId ?? null;
    const eventId = activeEvent?.id ?? null;
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
            queryFn: () => adminRepo.getNominationsPaged(resolvedEventId!, 0, 1, "pending"),
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

    return (
        <div className="space-y-5">
            {error ? (
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
                        <p>{getErrorMessage(error, "Não foi possível carregar o admin.")}</p>
                        <p className="text-[var(--ink-muted)]">Atualiza a edição ou confirma o backend antes de continuar a moderação.</p>
                    </div>
                </AdminStateMessage>
            ) : null}

                {section === "conteudo" ? (
                    <AdminContentSection
                        categoryProposals={categoryProposals}
                        categoriesCount={totalCategories}
                        eventId={eventId}
                        memberCount={summary?.membersTotal ?? 0}
                        officialResultsCount={summary?.officialResultsCategoriesCount ?? 0}
                        pendingNominationCount={pendingNominationCount}
                        loading={loading}
                        measureProposals={measureProposals}
                        onUpdate={handleRefresh}
                    />
                ) : section === "membros" ? (
                    <AdminMembersSection eventId={eventId} onUpdate={handleRefresh} loading={loading} />
                ) : (
                    <AdminControlCenter
                        eventId={eventId}
                        events={events}
                        loading={loading}
                        onRefresh={handleRefresh}
                        state={eventState}
                    />
                )}
        </div>
    );
}
