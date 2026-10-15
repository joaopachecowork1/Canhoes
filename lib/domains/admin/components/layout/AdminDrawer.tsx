"use client";

import { Drawer } from "vaul";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Admin drawer (bottom‑sheet on mobile, side panel on desktop).
 * Uses vaul's Drawer with a dark overlay and high‑contrast content panel
 * so the form is clearly visible against the blurred background.
 */
export function AdminDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
}: Readonly<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  trigger?: ReactNode;
}>) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Drawer.Portal>
        {/* Dark overlay with subtle blur so the background stays visible but dimmed */}
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md transition-opacity" />

        {/* Content panel — dark background with high contrast text */}
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[92svh] flex-col rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-deep)] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl focus:outline-none sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(30rem,calc(100vw-2rem))] sm:max-h-none sm:rounded-2xl">
          {/* Drag handle (mobile only) */}
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[var(--text-ghost)] sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 pb-3 pt-4">
            <div className="min-w-0 space-y-1">
              <Drawer.Title className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                {title}
              </Drawer.Title>
              {description && (
                <Drawer.Description className="text-sm text-[var(--text-muted)]">
                  {description}
                </Drawer.Description>
              )}
            </div>
            {onOpenChange && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
