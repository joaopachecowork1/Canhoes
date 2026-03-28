import React from "react";

import { cn } from "@/lib/utils";
import { colors } from "@/lib/theme/tokens";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
  className?: string;
  delay?: number;
}

export function StatCard({
  icon,
  label,
  value,
  color = colors.moss,
  className,
  delay = 0,
}: Readonly<StatCardProps>) {
  return (
    <div
      className={cn(
        "editorial-shell flex min-w-[148px] flex-col gap-3 rounded-[var(--radius-md-token)] px-4 py-4",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
          style={{
            backgroundColor: `${color}18`,
            borderColor: `${color}35`,
            color,
          }}
        >
          {icon}
        </div>
        <span className="editorial-kicker">Resumo</span>
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-semibold leading-none text-[var(--color-text-primary)]">
          {value}
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {label}
        </div>
      </div>
    </div>
  );
}
