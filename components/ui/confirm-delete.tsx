"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

import messages from "@/messages/pt.json";

interface ConfirmDeleteProps {
  onConfirm: () => void;
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
  iconOnly?: boolean;
}

const copy = messages.ui.ConfirmDeleteAction;

function DefaultTrigger({ iconOnly }: Readonly<{ iconOnly: boolean }>) {
  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--color-veil)]/5 hover:text-[var(--color-danger)]"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <Button variant="destructive" size="sm" className="gap-2">
      <Trash2 className="h-4 w-4" />
      {messages.common.delete}
    </Button>
  );
}

export function ConfirmDeleteAction({
  onConfirm,
  title = copy.defaultTitle,
  description = copy.defaultDescription,
  trigger,
  iconOnly = false,
}: ConfirmDeleteProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger ?? <DefaultTrigger iconOnly={iconOnly} />}</AlertDialogTrigger>
      <AlertDialogContent className="border border-[var(--color-veil)]/10 bg-[var(--bg-deep)] shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--text-primary)]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--text-muted)]">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[var(--color-veil)]/10 bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--color-veil)]/5 hover:text-[var(--text-primary)]">
            {messages.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            className="bg-[var(--color-danger)] text-[var(--text-primary)] hover:bg-[var(--color-danger-hover)]"
          >
            {messages.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
