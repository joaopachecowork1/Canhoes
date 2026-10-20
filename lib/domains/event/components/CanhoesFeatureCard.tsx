"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CanhoesFeatureCardProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  footer?: ReactNode;
  headerAction?: ReactNode;
  icon?: LucideIcon;
  title: string;
  variant?: "default" | "official";
};

const VARIANT_CLASSES = {
  default: {
    card: "text-[var(--ink-primary)]",
    header: "pb-2",
    title: "text-[var(--ink-primary)]",
    icon: "text-[var(--area,var(--moss))]",
    description: "text-[var(--ink-secondary)]",
  },
  official: {
    card: "",
    header: "space-y-1 pb-3",
    title: "text-[var(--text-primary)]",
    icon: "text-[var(--moss-glow)]",
    description: "text-[var(--text-muted)]",
  },
} as const;

/**
 * Cartão base das funcionalidades dos módulos.
 * Unifica o estilo visual de "official voting", "nominations", etc.
 *
 * @param children - Conteúdo principal do card.
 * @param description - Descrição opcional no cabeçalho.
 * @param footer - Conteúdo opcional de rodapé.
 * @param headerAction - Ação opcional no canto superior direito.
 * @param icon - Ícone opcional ao lado do título.
 * @param title - Título do card.
 * @param variant - Variante visual ("default" ou "official" com brilho).
 */
export function CanhoesFeatureCard({
  children,
  className,
  description,
  footer,
  headerAction,
  icon: Icon,
  title,
  variant = "default",
}: Readonly<CanhoesFeatureCardProps>) {
  const variantClasses = VARIANT_CLASSES[variant];

  return (
    <Card
      className={cn(
        "shadow-[var(--shadow-card),inset_0_4px_0_var(--area,var(--moss))] transition-colors",
        className,
        variantClasses.card,
      )}
    >
      <CardHeader className={cn("pb-2", variantClasses.header)}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={cn("flex items-center gap-2", variantClasses.title)}>
            {Icon ? <Icon className={cn("h-4 w-4", variantClasses.icon)} /> : null}
            {title}
          </CardTitle>
          {headerAction}
        </div>
        {description ? <p className={cn("text-sm", variantClasses.description)}>{description}</p> : null}
      </CardHeader>

      <CardContent className="space-y-3">{children}</CardContent>

      {footer ? <div className="px-6 pb-6 pt-0">{footer}</div> : null}
    </Card>
  );
}
