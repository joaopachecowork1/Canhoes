"use client";

import { formatCount } from "@/lib/utils";

type Props = {
  kicker: string;
  title: string;
  count: number;
  children?: React.ReactNode;
};

export function AdminCollapsibleSection({ kicker, title, count, children }: Readonly<Props>) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.03] shadow-[0_12px_30px_rgba(0,0,0,0.2)] text-[var(--color-text-primary)] text-[var(--color-text-primary)] rounded-[var(--radius-lg-token)] px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {kicker}
          </p>
          <p className="font-semibold text-[var(--ink-primary)]">{title}</p>
          <p className="body-small text-[var(--ink-muted)]">{formatCount(count, "item", "itens")}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
