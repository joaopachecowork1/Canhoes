"use client";

import type { ReactNode } from "react";

import type { AdminModuleKey } from "@/lib/api/types";
import { useEventModuleAccess } from "@/hooks/useEventModuleAccess";
import { AsyncStatusCard } from "@/components/ui/async-status-card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { SectionBoundary } from "@/components/ui/section-boundary";
import { Card, CardContent } from "@/components/ui/card";

import { EventModuleUnavailableState } from "./EventModuleUnavailableState";

/** Shows a module page only when the user may open it, with loading, error and "closed" states. */
export function EventModuleGate({
  children,
  moduleKey,
}: Readonly<{
  children: ReactNode;
  moduleKey: AdminModuleKey;
}>) {
  const access = useEventModuleAccess(moduleKey);

  // Only the first fetch shows a loader; a background refetch keeps the page on screen.
  if (access.isLoading) {
    return (
      <AsyncStatusCard
        label="A validar acesso"
        hint={`A confirmar se ${access.module.label.toLowerCase()} está disponível neste evento.`}
        timeoutHint="A validação de acesso está a demorar mais do que o normal. Podes tentar novamente sem sair desta página."
        onAction={() => void access.refresh()}
      />
    );
  }

  if (access.error || !access.event || !access.overview) {
    return (
      <Card className="rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,rgba(18,24,11,0.92),rgba(11,14,8,0.94))] text-[var(--color-text-primary)] shadow-[var(--shadow-panel)]">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <ErrorAlert
            title={`Erro ao abrir ${access.module.label}`}
            description={
              access.error?.message ??
              "Não foi possível confirmar o estado do evento agora. Tenta novamente para recuperar esta área."
            }
            actionLabel="Tentar novamente"
            onAction={() => void access.refresh()}
          />
        </CardContent>
      </Card>
    );
  }

  if (!access.isAllowed) {
    return (
      <EventModuleUnavailableState
        title={`${access.module.label} indisponível`}
        description="Esta área não está aberta para ti na configuração atual do evento ou na fase ativa."
        fallbackHref={access.fallbackHref}
        fallbackLabel={access.fallbackLabel}
      />
    );
  }

  return (
    <SectionBoundary
      title={`Erro nesta área: ${access.module.label}`}
      description={`Esta área falhou ao renderizar, mas o resto da experiência continua disponível. Tenta abrir ${access.module.label.toLowerCase()} novamente.`}
      onRetry={() => void access.refresh()}
      resetKey={moduleKey}
    >
      {children}
    </SectionBoundary>
  );
}
