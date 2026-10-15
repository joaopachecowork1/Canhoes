"use client";

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

import type { DeleteConfirmationRequest } from "../proposalTypes";

type ProposalDeleteDialogProps = {
  request: DeleteConfirmationRequest | null;
  onClose: () => void;
};

export function ProposalDeleteDialog({
  request,
  onClose,
}: Readonly<ProposalDeleteDialogProps>) {
  return (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar proposta?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove a proposta &ldquo;
            {request?.title ?? ""}
            &rdquo; permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              request?.onConfirm();
              onClose();
            }}
          >
            Apagar proposta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
