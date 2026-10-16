"use client";

import type { AwardCategoryDto } from "@/lib/api/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.admin.CategoryDeleteDialog;

export function CategoryDeleteDialog({
  isPending,
  onCancel,
  onConfirm,
  target,
}: Readonly<{ isPending: boolean; onCancel: () => void; onConfirm: () => void; target: AwardCategoryDto | null }>) {
  return (
    <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {target ? formatMessage(copy.description, { name: target.name }) : copy.fallbackDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {copy.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
