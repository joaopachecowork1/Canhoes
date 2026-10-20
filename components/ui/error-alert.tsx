import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

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

const TONE_CLASSES: Record<ErrorAlertTone, { border: string; icon: string; title: string; body: string; action: string }> = {
  danger: {
    border: "border-[var(--color-danger)]/50 text-[var(--text-primary)]",
    icon: "text-[var(--color-danger)]",
    title: "text-[var(--color-text-primary)]",
    body: "text-[var(--text-secondary)]",
    action: "border-[var(--color-danger)]/40 text-[var(--color-text-primary)] hover:bg-[var(--color-danger)]/10",
  },
  official: {
    border: "border-[var(--moss)]/40 text-[var(--text-primary)]",
    icon: "text-[var(--moss-glow)]",
    title: "text-[var(--color-text-primary)]",
    body: "text-[var(--text-secondary)]",
    action: "border-[var(--color-veil)]/12 text-[var(--color-text-primary)] hover:bg-[var(--color-veil)]/8",
  },
  social: {
    border: "border-[var(--person-violet)]/40 text-[var(--text-primary)]",
    icon: "text-[var(--moss-glow)]",
    title: "text-[var(--color-text-primary)]",
    body: "text-[var(--text-secondary)]",
    action: "border-[var(--color-veil)]/12 text-[var(--color-text-primary)] hover:bg-[var(--color-veil)]/8",
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
        "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 overflow-hidden rounded-2xl border-2 bg-[var(--color-bg-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-elevation-sm)] has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
        toneClasses.border,
        className
      )}
    >
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAction}
            className={cn("border bg-transparent backdrop-blur-sm", toneClasses.action)}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
