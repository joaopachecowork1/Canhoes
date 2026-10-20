"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** A form kept behind one button: the page shows the list first, and the form opens from the bottom. */
export function FormSheet({
  children,
  isOpen,
  onOpenChange,
  title,
  triggerLabel,
}: Readonly<{
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  triggerLabel: string;
}>) {
  return (
    <>
      <Button type="button" className="w-full" onClick={() => onOpenChange(true)}>
        <Plus className="h-5 w-5" aria-hidden />
        {triggerLabel}
      </Button>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">{children}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
