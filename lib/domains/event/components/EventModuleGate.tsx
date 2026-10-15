"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";

import type { AdminModuleKey } from "@/lib/api/types";
import { useEventOverview } from "@/hooks/useEventOverview";
import { CANHOES_MODULE_BY_KEY } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";

const GATE_CARD_CLASS =
  "rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,rgba(18,24,11,0.92),rgba(11,14,8,0.94))] text-[var(--color-text-primary)] shadow-[var(--shadow-panel)]";

/** Shows a module page only when the user may open it: admins always, members when the phase opens it. */
export function EventModuleGate({
  children,
  moduleKey,
}: Readonly<{
  children: ReactNode;
  moduleKey: AdminModuleKey;
}>) {
  const { error, event, isLoading, overview, refresh } = useEventOverview();
  const moduleLabel = CANHOES_MODULE_BY_KEY[moduleKey].label;

  // Only the first fetch shows a loader; a background refetch keeps the page on screen.
  if (isLoading) {
    return <Skeleton role="status" aria-label="A validar acesso" className="h-56 w-full rounded-[var(--radius-lg-token)]" />;
  }

  if (error || !event || !overview) {
    return (
      <Card className={GATE_CARD_CLASS}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <ErrorAlert
            title={`Erro ao abrir ${moduleLabel}`}
            description={
              error?.message ??
              "Não foi possível confirmar o estado do evento agora. Tenta novamente para recuperar esta área."
            }
            actionLabel="Tentar novamente"
            onAction={() => void refresh()}
          />
        </CardContent>
      </Card>
    );
  }

  if (!overview.permissions.isAdmin && !overview.modules[moduleKey]) {
    return (
      <Card className={GATE_CARD_CLASS}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Lock className="h-4 w-4 text-[var(--accent-purple-deep)]" />
            {moduleLabel} indisponível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="body-small text-[rgba(255,255,255,0.78)]">
            Esta área não está aberta para ti na configuração atual do evento ou na fase ativa.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Isto pode acontecer se a fase do evento mudou ou se um admin ocultou este módulo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/canhoes">Voltar ao evento</Link>
            </Button>
            <Button variant="outline" onClick={() => globalThis.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
