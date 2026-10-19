import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminStateMessageProps = {
  action?: ReactNode;
  children: ReactNode;
  variant?: "page" | "panel" | "card";
  tone?: "default" | "warning" | "error";
};

const VARIANT_CLASSES: Record<NonNullable<AdminStateMessageProps["variant"]>, string> = {
  page:
    "text-[var(--color-text-primary)] flex min-h-[50vh] items-center justify-center rounded-[var(--radius-lg-token)] border border-[var(--border-paper)] bg-[var(--bg-paper)] px-5 py-7 text-center text-[var(--ink-primary)] shadow-[var(--shadow-paper)]",
  panel:
    "text-[var(--color-text-primary)] flex items-center justify-center rounded-[var(--radius-md-token)] border border-dashed border-[var(--border-paper)] bg-[var(--bg-paper-soft)] px-4 py-6 text-center body-small text-[var(--ink-primary)] shadow-none",
  card: "flex items-center justify-center text-center text-[var(--ink-primary)]",
};

const TONE_CLASSES: Record<NonNullable<AdminStateMessageProps["tone"]>, string> = {
  default: "border-[var(--border-paper)] bg-[var(--bg-paper)] text-[var(--ink-primary)]",
  warning: "border-[var(--neon-amber)]/30 bg-[var(--neon-amber)]/10 text-[var(--ink-primary)]",
  error: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--ink-primary)]",
};

export function AdminStateMessage({ action, children, variant = "panel", tone = "default" }: Readonly<AdminStateMessageProps>) {
  return (
    <div className={cn(VARIANT_CLASSES[variant], TONE_CLASSES[tone])}>
      <div className="flex flex-col items-center justify-center gap-3">
        {children}
        {action}
      </div>
    </div>
  );
}
