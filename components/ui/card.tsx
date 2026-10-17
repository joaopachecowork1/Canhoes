import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Painel base com estilo "surface" para contentores de UI.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card" className={cn("border border-[var(--border-paper-soft)] bg-[var(--bg-paper-soft)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-[26px] text-[var(--color-text-primary)]", className)} {...props} />
  );
}

/**
 * Cabeçalho do Card com suporte para grelha automática e ações.
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-header" className={cn("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2.5 px-4 pt-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] sm:px-6 sm:pt-6 [.border-b]:pb-4", className)} {...props} />
  );
}

/**
 * Título do Card estilizado como heading-3.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-title" className={cn("heading-3 text-[var(--color-text-primary)]", className)} {...props} />
  );
}

/**
 * Descrição do Card estilizada como body-small.
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-description" className={cn("body-small text-[var(--color-text-muted)]", className)} {...props} />
  );
}

/**
 * Conteúdo principal do Card com padding responsivo.
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-4 pb-4 sm:px-6 sm:pb-6", className)} {...props} />
  );
}

/**
 * Rodapé do Card, geralmente para ações secundárias ou metadados.
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-footer" className={cn("flex items-center px-4 pb-4 sm:px-6 sm:pb-6 [.border-t]:pt-4", className)} {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
