"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AsyncStatusCardProps = {
  actionLabel?: string;
  className?: string;
  hint?: string;
  label: string;
  onAction?: () => void;
  timeoutHint?: string;
  timeoutMs?: number;
};

/**
 * Card de estado de carregamento assíncrono.
 * Exibe um spinner e uma mensagem enquanto aguarda por dados,
 * com suporte para timeout e ação de recuperação (retry).
 * 
 * @param actionLabel - Texto do botão de ação em caso de timeout.
 * @param className - Classes CSS opcionais.
 * @param hint - Mensagem de apoio opcional.
 * @param label - Título ou estado atual (ex: "A carregar feeds").
 * @param onAction - Função para tentar novamente após timeout.
 * @param timeoutHint - Mensagem exibida após o timeout expirar.
 * @param timeoutMs - Tempo em milissegundos antes de considerar timeout.
 */
export function AsyncStatusCard({
  actionLabel = "Tentar novamente",
  className,
  hint,
  label,
  onAction,
  timeoutHint = "Se isto demorar mais do que o normal, tenta atualizar esta área.",
  timeoutMs = 12000,
}: Readonly<AsyncStatusCardProps>) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    const timer = globalThis.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => globalThis.clearTimeout(timer);
  }, [label, timeoutMs]);

  return (
    <Card
      className={cn(
        "rounded-[var(--radius-lg-token)]",
        className
      )}
    >
      <CardContent className="flex min-h-[14rem] flex-col items-center justify-center gap-3 p-5 text-center">
        <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--moss)]" />
          <span className="font-[var(--font-mono)] text-sm uppercase tracking-[0.16em]">
            {label}
          </span>
        </div>

        {hint ? (
          <p className="max-w-md text-sm text-[var(--color-text-muted)]">{hint}</p>
        ) : null}

        {timedOut ? (
          <div className="space-y-3">
            <p className="max-w-md text-sm text-[var(--color-text-muted)]">{timeoutHint}</p>
            {onAction ? (
              <div className="flex justify-center">
                <Button type="button" size="sm" variant="outline" onClick={onAction}>
                  {actionLabel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
