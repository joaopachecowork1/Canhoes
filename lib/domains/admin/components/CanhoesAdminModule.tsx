"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useAdminBootstrap } from "@/lib/domains/admin/hooks/useAdminBootstrap";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { ApiError } from "@/lib/api/canhoesClient";
import type { EventActiveContextDto } from "@/lib/api/types";
import messages from "@/messages/pt.json";

import type { AdminSectionId } from "./adminSections";
import { AdminContentSection } from "./layout/AdminContentSection";
import { AdminStateMessage } from "./layout/AdminStateMessage";
import { AdminControlCenter } from "./event/AdminControlCenter";
import { AdminMembersSection } from "./users/AdminMembersSection";
import { invalidateAfterAdminWrite } from "@/lib/queryKeys";

const copy = messages.admin.CanhoesAdminModule;

type CanhoesAdminModuleProps = {
  section: AdminSectionId;
  initialEventId?: string | null;
  initialContext?: EventActiveContextDto | null;
};

/** Regista no log do cliente o erro de arranque do admin, com o estado e detalhes quando vêm da API. */
function useLogBootstrapError(error: unknown) {
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
}

/** Aviso de erro de carregamento do admin, com botão para tentar de novo. */
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

/** Escolhe o conteúdo da secção ativa; o conteúdo é a secção por omissão. */
function AdminSectionView({
  bootstrap,
  eventId,
  loading,
  onRefresh,
  section,
}: Readonly<{
  bootstrap: Bootstrap;
  eventId: string | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  section: AdminSectionId;
}>) {
  if (section === "membros") return <AdminMembersSection eventId={eventId} onUpdate={onRefresh} loading={loading} />;
  if (section === "configuracoes") {
    return (
      <AdminControlCenter
        eventId={eventId}
        events={bootstrap.events}
        loading={loading}
        onRefresh={onRefresh}
        state={bootstrap.state}
      />
    );
  }

  return <AdminContentSection eventId={eventId} onUpdate={onRefresh} />;
}

/** Módulo do admin: cabeçalho, erro de arranque e a secção escolhida (conteúdo, membros ou evento). */
export default function CanhoesAdminModule({
  section,
  initialEventId,
  initialContext,
}: Readonly<CanhoesAdminModuleProps>) {
  const { event: activeEvent, refresh: refreshOverview } = useEventOverview(initialContext);
  const queryClient = useQueryClient();
  // o evento do servidor (SSR) serve até o overview carregar
  const resolvedEventId = activeEvent?.id ?? initialEventId ?? null;
  const eventId = activeEvent?.id ?? null;
  const bootstrap = useAdminBootstrap(resolvedEventId);

  const handleRefresh = useCallback(async () => {
    // invalida as queries do admin e o overview em paralelo
    await Promise.all([invalidateAfterAdminWrite(queryClient, resolvedEventId), refreshOverview()]);
  }, [resolvedEventId, queryClient, refreshOverview]);

  useLogBootstrapError(bootstrap.error);

  return (
    <div className="space-y-5">
      <CanhoesModuleHeader module="admin" title={copy.title} description={copy.description} />
      {bootstrap.error ? <AdminLoadError error={bootstrap.error} onRetry={() => void handleRefresh()} /> : null}

      <AdminSectionView
        section={section}
        eventId={eventId}
        loading={bootstrap.loading}
        onRefresh={handleRefresh}
        bootstrap={bootstrap}
      />
    </div>
  );
}
