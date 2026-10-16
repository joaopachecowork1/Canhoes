import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CanhoesDecorativeDivider, CanhoesGlowBackdrop } from "@/components/ui/canhoes-bits";

type EmptyStateTone = "admin" | "official" | "shell" | "social";

const TONE_PANEL_CLASS: Record<EmptyStateTone, string> = {
  admin: "canhoes-bits-panel--admin",
  official: "canhoes-bits-panel--official",
  shell: "canhoes-bits-panel--shell",
  social: "canhoes-bits-panel--social",
};

/**
 * Empty state with icon, title, optional description and action.
 */
export function EmptyState({
  action,
  className,
  description,
  icon: Icon,
  tone = "shell",
  title,
}: {
  action?: React.ReactNode;
  className?: string;
  description?: string;
  icon?: LucideIcon;
  tone?: EmptyStateTone;
  title: string;
}) {
  return (
    <div
      className={cn(
        "border border-[var(--border-paper-soft)] bg-[var(--bg-paper-soft)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-[26px] relative flex flex-col items-center justify-center gap-4 px-6 py-10 text-center",
        TONE_PANEL_CLASS[tone],
        className
      )}
    >
      {tone === "shell" || tone === "social" ? <CanhoesGlowBackdrop tone={tone} /> : null}

      {Icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/8 bg-white/[0.05] text-[var(--moss)] shadow-none">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      </div>

      {(description || action) ? <CanhoesDecorativeDivider tone="moss" className="max-w-40" /> : null}

      {action ? <div className="w-full max-w-xs">{action}</div> : null}
    </div>
  );
}
