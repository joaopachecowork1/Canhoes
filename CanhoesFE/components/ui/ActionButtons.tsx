/**
 * ActionButtons — Botões de Aprovar/Rejeitar com confirmação
 * 
 * Usado no Admin para gestão de nomeações e propostas.
 */

import React, { useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme/tokens';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ActionButtonsProps {
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  className?: string;
}

export function ActionButtons({
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  className,
}: ActionButtonsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleApprove = () => {
    onApprove?.();
  };

  const handleReject = () => {
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    onReject?.();
    setShowRejectDialog(false);
  };

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className="h-9 px-4 gap-2"
          style={{
            backgroundColor: colors.success,
            color: colors.textPrimary,
          }}
        >
          <Check className="h-4 w-4" />
          <span className="hidden sm:inline">Aprovar</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          className="h-9 px-4 gap-2 border-danger/30"
          style={{
            color: colors.danger,
          }}
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Rejeitar</span>
        </Button>
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent
          style={{
            backgroundColor: colors.bgCard,
            borderColor: colors.beigeDark,
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle
              className="flex items-center gap-2"
              style={{ color: colors.danger }}
            >
              <AlertTriangle className="h-5 w-5" />
              Confirmar Rejeição
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: colors.textSecondary }}>
              Tens a certeza que queres rejeitar esta nomeação? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{
                backgroundColor: 'transparent',
                borderColor: colors.beigeDark,
                color: colors.textSecondary,
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              style={{
                backgroundColor: colors.danger,
                color: colors.textPrimary,
              }}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
