"use client";

import type { ComponentProps, ReactNode } from "react";
import { ADMIN_NAV_ITEM } from "@/components/chrome/canhoes/canhoesNavigation";
import type { AdminModuleKey } from "@/lib/api/types";
import { CANHOES_MODULE_BY_KEY } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";

type CanhoesModuleHeaderProps = {
  badgeLabel?: ReactNode;
  badgeVariant?: ComponentProps<typeof Badge>["variant"];
  description: string;
  /** A área a que esta página pertence; o ícone é o que a dock e o menu mostram. */
  module: AdminModuleKey | "admin";
  title: string;
};

/**
 * Cabeçalho padrão dos módulos do evento Canhões.
 * Inclui o ícone da área, o título, a descrição e um selo de estado opcional.
 */
export function CanhoesModuleHeader({
  badgeLabel,
  badgeVariant = "outline",
  description,
  module,
  title,
}: Readonly<CanhoesModuleHeaderProps>) {
  const Icon = module === "admin" ? ADMIN_NAV_ITEM.icon : CANHOES_MODULE_BY_KEY[module].icon;
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] normal-case">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--area,var(--moss))] text-[var(--on-person)]">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          {title}
        </h1>
        <p className="body-base text-[var(--color-text-muted)]">{description}</p>
      </div>

      {badgeLabel ? <Badge variant={badgeVariant}>{badgeLabel}</Badge> : null}
    </div>
  );
}
