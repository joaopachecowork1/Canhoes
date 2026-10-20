import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Superfície "papel" dos cartões de admin; o `Card` junta-a por cima dos seus estilos por omissão. */
export const ADMIN_CONTENT_CARD_CLASS =
  "border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-card)]";

/** Painel suave para mostrar detalhes dentro de um cartão ou gaveta de admin. */
export function AdminDetailPanel({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md-token)] border border-[var(--border-paper)] bg-[var(--bg-paper-soft)] px-4 py-3 text-[var(--color-text-primary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Botão de largura total para escolher um item de uma lista; `selected` realça o escolhido. */
export function AdminSelectableButton({
  children,
  className,
  selected = false,
  ...props
}: Readonly<ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }>) {
  return (
    <button
      {...props}
      className={cn(
        "min-h-11 w-full rounded-[var(--radius-md-token)] border border-[var(--border-paper)] px-3 py-2.5 text-left text-[var(--ink-primary)] transition-colors",
        selected ? "bg-[var(--moss)]/10" : "bg-[var(--bg-paper)] hover:bg-[var(--bg-paper-soft)]",
        className,
      )}
    >
      {children}
    </button>
  );
}
