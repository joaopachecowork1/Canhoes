"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logFrontendError } from "@/lib/errors";

/**
 * Root-level error boundary for the entire app.
 * Catches errors that crash the root layout (fonts, providers, etc).
 * Unlike route-level `error.tsx`, this is the last line of defence.
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logFrontendError("GlobalError", error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="pt">
      <body className="min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="space-y-2">
            <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.68)]">
              Erro critico
            </p>
            <h1 className="text-2xl font-semibold text-[var(--bg-paper)]">
              Algo correu mal a carregar a aplicacao
            </h1>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              O erro nao ficou isolado numa area especifica.
              Tenta novamente ou recarrega a pagina para recuperar.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => reset()}>
              Tentar novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => globalThis.location.reload()}
            >
              Recarregar pagina
            </Button>
            <Button
              variant="ghost"
              // The root layout crashed, so the router cannot be trusted: do a full reload.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              onClick={() => globalThis.location.assign("/canhoes")}
            >
              Ir para o evento
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && error?.message ? (
            <details className="mt-4 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-deep)] p-4 text-left">
              <summary className="cursor-pointer text-xs font-medium text-[var(--text-muted)]">
                Detalhes tecnicos
              </summary>
              <pre className="mt-2 overflow-x-auto text-[11px] text-[var(--text-ghost)]">
                {error.message}
              </pre>
            </details>
          ) : null}
        </div>
      </body>
    </html>
  );
}
