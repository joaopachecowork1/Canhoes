"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { getErrorMessage, logFrontendError } from "@/lib/errors";

export default function CanhoesError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logFrontendError("CanhoesErrorBoundary", error);
  }, [error]);

  return (
    <Card className="rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,rgba(18,24,11,0.92),rgba(11,14,8,0.94))] text-[var(--bg-paper)] shadow-[var(--shadow-panel)]">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.68)]">
            Recuperacao
          </p>
          <h1 className="text-xl font-semibold text-[var(--bg-paper)]">Esta area falhou</h1>
        </div>

        <ErrorAlert
          title="Erro ao carregar esta secao"
          description={getErrorMessage(
            error,
            "O erro ficou isolado nesta area. Tenta novamente para recuperar o conteudo ou volta ao evento."
          )}
        />

        <div className="flex flex-wrap gap-2">
          <Button className="canhoes-tap canhoes-neon-border" onClick={() => reset()}>
            Tentar novamente
          </Button>
          <Button
            className="canhoes-tap"
            variant="outline"
            // A full reload discards the client state that crashed.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            onClick={() => globalThis.location.assign("/canhoes")}
          >
            Voltar ao evento
          </Button>
          <Button
            className="canhoes-tap"
            variant="ghost"
            onClick={() => globalThis.location.reload()}
          >
            Recarregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
