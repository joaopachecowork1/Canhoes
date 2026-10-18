"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type DockItem = {
  ariaLabel?: string;
  ariaPressed?: boolean;
  buttonClassName?: string;
  icon: LucideIcon;
  iconClassName?: string;
  isActive?: boolean;
  label: string;
  onClick?: () => void;
};

type DockProps = {
  className?: string;
  dockClassName?: string;
  items: readonly DockItem[];
};

function DockButton({ ariaLabel, ariaPressed, buttonClassName, icon: Icon, iconClassName, isActive, label, onClick }: Readonly<DockItem>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive && !ariaPressed ? "page" : undefined}
      aria-pressed={ariaPressed}
      aria-label={ariaLabel ?? label}
      className={cn(
        "relative flex min-h-[3.375rem] w-full flex-col items-center justify-center gap-1 rounded-[0.95rem] border px-2 py-2 text-[11px] font-semibold leading-none transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-void)]",
        isActive
          ? "border-transparent bg-transparent text-[var(--neon-amber)]"
          : "border-transparent bg-transparent text-[rgba(255,255,255,0.78)] hover:bg-[rgba(255,255,255,0.06)]",
        buttonClassName
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center",
          isActive && "text-[var(--neon-amber)]"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} />
      </span>
      <span
        className={cn(
          "truncate font-[var(--font-mono)] text-[10px] uppercase tracking-[0.08em]",
          isActive && "underline decoration-[var(--neon-amber)] decoration-2 underline-offset-[6px]"
        )}
      >
        {label}
      </span>
    </button>
  );
}

function Dock({ className, dockClassName, items }: Readonly<DockProps>) {
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn("grid w-full gap-1.5", dockClassName)}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <DockButton key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}

export { Dock };
