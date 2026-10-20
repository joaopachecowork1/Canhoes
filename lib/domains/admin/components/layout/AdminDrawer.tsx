"use client";

import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Bottom sheet for admin forms and reviews. */
export function AdminDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92svh] gap-0">
        <SheetHeader className="border-b border-[var(--border-subtle)] px-5 pb-3 pr-14">
          <SheetTitle className="text-lg font-bold sm:text-xl">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
