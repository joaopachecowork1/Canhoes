import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateTone = "admin" | "official" | "shell" | "social";

const TONE_PANEL_CLASS: Record<EmptyStateTone, string> = {
  admin: "",
  official: "",
  shell: "",
  social: "",
};

/** Estado vazio com ícone, título e, opcionalmente, descrição e ação. */
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
        "border-2 border-dashed border-[var(--color-border-strong)] rounded-2xl relative flex flex-col items-center justify-center gap-4 px-6 py-10 text-center",
        TONE_PANEL_CLASS[tone],
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border-strong)] text-[var(--moss-glow)]">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      </div>

      {action ? <div className="w-full max-w-xs">{action}</div> : null}
    </div>
  );
}
