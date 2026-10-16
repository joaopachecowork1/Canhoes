import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { CanhoesDecorativeDivider, CanhoesGlowBackdrop } from "@/components/ui/canhoes-bits";
import { Button } from "@/components/ui/button";

type ErrorAlertTone = "danger" | "official" | "social";

type ErrorAlertProps = {
  actionLabel?: string;
  className?: string;
  description: string;
  onAction?: () => void;
  tone?: ErrorAlertTone;
  title?: string;
};

const DIVIDER_TONE = { danger: "amber", official: "moss", social: "purple" } as const;

const TONE_CLASSES: Record<ErrorAlertTone, { border: string; icon: string; title: string; body: string; action: string }> = {
  danger: {
    border: "border-[rgba(224,90,58,0.24)]",
    icon: "text-[rgba(255,236,231,0.94)]",
    title: "text-[rgba(255,236,231,0.98)]",
    body: "text-[rgba(255,236,231,0.82)]",
    action: "border-[rgba(255,236,231,0.18)] text-[rgba(255,236,231,0.92)] hover:bg-[rgba(44,24,16,0.96)]",
  },
  official: {
    border: "border-[rgba(0,255,136,0.18)] text-[rgba(255,255,255,0.94)]",
    icon: "text-[var(--neon-green)]",
    title: "text-[var(--color-text-primary)]",
    body: "text-[rgba(255,255,255,0.76)]",
    action: "border-[rgba(255,255,255,0.12)] text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.08)]",
  },
  social: {
    border: "border-[rgba(177,140,255,0.22)] text-[rgba(255,255,255,0.94)]",
    icon: "text-[var(--neon-green)]",
    title: "text-[var(--color-text-primary)]",
    body: "text-[rgba(255,255,255,0.76)]",
    action: "border-[rgba(255,255,255,0.12)] text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.08)]",
  },
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
  title = messages.ui.ErrorAlert.defaultTitle,
}: Readonly<ErrorAlertProps>) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-[var(--radius-sm-token)] border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
        "border border-white/5 bg-white/[0.025] shadow-none rounded-[1.25rem] text-[var(--color-text-primary)]",
        "border border-[var(--border-paper-soft)] bg-[var(--bg-paper-soft)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-[26px] relative overflow-hidden border text-[rgba(255,236,231,0.94)]",
        toneClasses.border,
        className
      )}
    >
      <CanhoesGlowBackdrop tone={tone} />
      <AlertCircle className={toneClasses.icon} />
      <div className={cn("col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight", toneClasses.title)}>
        {title}
      </div>
      <div
        className={cn(
          "col-start-2 grid justify-items-start gap-1 text-sm text-[var(--color-text-muted)] [&_p]:leading-relaxed space-y-3",
          toneClasses.body
        )}
      >
        <p>{description}</p>
        {actionLabel && onAction ? (
          <>
            <CanhoesDecorativeDivider tone={DIVIDER_TONE[tone]} className="max-w-44" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAction}
              className={cn("border bg-transparent backdrop-blur-sm", toneClasses.action)}
            >
              {actionLabel}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
