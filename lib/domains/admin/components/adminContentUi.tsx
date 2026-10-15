import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Paper surface for admin cards; `Card` merges it over its own defaults. */
export const ADMIN_CONTENT_CARD_CLASS =
  "border-[var(--border-paper)] bg-[var(--bg-paper)] shadow-[var(--shadow-paper)]";

export function AdminDetailPanel({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md-token)] border border-[var(--border-paper)] bg-[var(--bg-paper-soft)] px-4 py-3 text-[var(--color-text-primary)]",
        className
      )}
    >
      {children}
    </div>
  );
}

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
        selected ? "bg-[rgba(122,173,58,0.1)]" : "bg-[var(--bg-paper)] hover:bg-[var(--bg-paper-soft)]",
        className
      )}
    >
      {children}
    </button>
  );
}
