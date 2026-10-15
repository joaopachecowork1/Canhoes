import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { CanhoesDecorativeDivider, CanhoesGlowBackdrop } from "@/components/ui/canhoes-bits";
import { Button } from "@/components/ui/button";

type ErrorAlertProps = {
  actionLabel?: string;
  className?: string;
  description: string;
  onAction?: () => void;
  tone?: "danger" | "official" | "social";
  title?: string;
};

/**
 * Alerta de erro estilizado com suporte para diferentes tons e ações.
 * Ideal para exibir falhas de carregamento ou erros de submissão de formulários.
 * 
 * @param actionLabel - Texto opcional para o botão de ação (ex: "Tentar novamente").
 * @param className - Classes CSS opcionais.
 * @param description - Mensagem detalhada do erro.
 * @param onAction - Função executada ao clicar no botão de ação.
 * @param tone - O tom visual do alerta, influenciando cores e brilho.
 * @param title - Título curto do erro.
 */
export function ErrorAlert({
  actionLabel,
  className,
  description,
  onAction,
  tone = "danger",
  title = "Algo correu mal",
}: Readonly<ErrorAlertProps>) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-[var(--radius-sm-token)] border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
        "border border-white/5 bg-white/[0.025] shadow-none rounded-[1.25rem] text-[var(--color-text-primary)]",
        "border border-white/[0.06] bg-white/[0.03] shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-[26px] relative overflow-hidden border text-[rgba(255,236,231,0.94)]",
        tone === "danger" && "border-[rgba(224,90,58,0.24)]",
        tone === "official" &&
          "border-[rgba(0,255,136,0.18)] text-[rgba(255,255,255,0.94)]",
        tone === "social" &&
          "border-[rgba(177,140,255,0.22)] text-[rgba(255,255,255,0.94)]",
        className
      )}
    >
      <CanhoesGlowBackdrop tone={tone === "danger" ? "danger" : tone} />
      <AlertCircle
        className={cn(
          tone === "danger" ? "text-[rgba(255,236,231,0.94)]" : "text-[var(--neon-green)]"
        )}
      />
      <div
        className={cn(
          "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight",
          tone === "danger" ? "text-[rgba(255,236,231,0.98)]" : "text-[var(--color-text-primary)]"
        )}
      >
        {title}
      </div>
      <div
        className={cn(
          "col-start-2 grid justify-items-start gap-1 text-sm text-[var(--color-text-muted)] [&_p]:leading-relaxed space-y-3",
          tone === "danger" ? "text-[rgba(255,236,231,0.82)]" : "text-[rgba(255,255,255,0.76)]"
        )}
      >
        <p>{description}</p>
        {actionLabel && onAction ? (
          <>
            <CanhoesDecorativeDivider
              tone={tone === "social" ? "purple" : tone === "official" ? "moss" : "amber"}
              className="max-w-44"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAction}
              className={cn(
                "border bg-transparent backdrop-blur-sm",
                tone === "danger" &&
                  "border-[rgba(255,236,231,0.18)] text-[rgba(255,236,231,0.92)] hover:bg-[rgba(44,24,16,0.96)]",
                tone !== "danger" &&
                  "border-[rgba(255,255,255,0.12)] text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.08)]"
              )}
            >
              {actionLabel}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
