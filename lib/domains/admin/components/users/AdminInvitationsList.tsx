"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { UserInvitationDto } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { formatMessage } from "@/lib/messages";
import { queryKeys } from "@/lib/queryKeys";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { AdminStateMessage } from "../layout/AdminStateMessage";

const copy = messages.admin.AdminInvitationsList;
const inviteUserCopy = messages.admin.AdminInviteUser;
const CARD_CLASS = "border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-card)]";
const COPIED_RESET_MS = 2500;

function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

type InvitationRowProps = {
  invitation: UserInvitationDto;
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
  isResending: boolean;
  isRevoking: boolean;
};

/** Etiqueta de estado do convite. */
function InvitationStatusBadge({ status }: Readonly<{ status: UserInvitationDto["status"] }>) {
  if (status === "used") return <Badge variant="default">{copy.statusUsed}</Badge>;
  if (status === "expired") return <Badge variant="destructive">{copy.statusExpired}</Badge>;
  return <Badge variant="amber">{copy.statusPending}</Badge>;
}

/** Botões de ação do convite (copiar, reenviar, revogar). */
function InvitationActionButtons({
  invitation,
  onResend,
  onRevoke,
  isResending,
  isRevoking,
}: Readonly<InvitationRowProps>) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(invitation.inviteUrl);
    setIsCopied(true);
    toast.success(inviteUserCopy.copied);
    setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
  };

  if (invitation.status === "used") {
    return <span className="text-xs text-[var(--moss-glow)] font-medium">{copy.statusUsed}</span>;
  }

  return (
    <div className="flex items-center gap-2 self-end sm:self-center">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="h-8 gap-1.5 text-xs"
        aria-label={copy.copyLink}
      >
        {isCopied ? <Check className="h-3.5 w-3.5 text-[var(--moss-glow)]" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{copy.copyLink}</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onResend(invitation.id)}
        disabled={isResending || isRevoking}
        className="h-8 gap-1.5 text-xs"
        aria-label={copy.resendEmail}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
        <span>{isResending ? copy.resending : copy.resendEmail}</span>
      </Button>
      <ConfirmDeleteAction
        title={copy.revokeConfirmTitle}
        description={copy.revokeConfirmDescription}
        onConfirm={() => onRevoke(invitation.id)}
        trigger={
          <Button
            size="sm"
            variant="ghost"
            disabled={isResending || isRevoking}
            className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-[var(--color-danger)]"
            aria-label={copy.revoke}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}

/** Uma linha da lista de convites gerados com estado, link e ações. */
function InvitationRow(props: Readonly<InvitationRowProps>) {
  const { invitation } = props;
  const roleLabel = invitation.role === "admin" ? inviteUserCopy.adminRole : inviteUserCopy.memberRole;

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{invitation.email}</p>
          <Badge variant={invitation.role === "admin" ? "amber" : "secondary"} className="h-5 px-2 text-[10px]">
            {roleLabel}
          </Badge>
          <InvitationStatusBadge status={invitation.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--color-text-muted)]">
          <span>{formatMessage(copy.createdOn, { date: formatDateTime(invitation.createdAtUtc) })}</span>
          {invitation.usedAtUtc ? (
            <span className="text-[var(--moss-glow)]">
              {formatMessage(copy.usedOn, { date: formatDateTime(invitation.usedAtUtc) })}
            </span>
          ) : (
            <span>{formatMessage(copy.expiresOn, { date: formatDateTime(invitation.expiresAtUtc) })}</span>
          )}
        </div>
      </div>
      <InvitationActionButtons {...props} />
    </li>
  );
}

/** Hook para consulta e mutações de convites no painel de admin. */
function useAdminInvitations(eventId: string) {
  const queryClient = useQueryClient();
  const [activeResendId, setActiveResendId] = useState<string | null>(null);
  const [activeRevokeId, setActiveRevokeId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.admin.invites(eventId),
    queryFn: () => adminRepo.getInvitations(eventId),
  });

  const resendMutation = useMutation({
    mutationFn: (inviteId: string) => adminRepo.resendInvitation(inviteId),
    onMutate: (inviteId) => setActiveResendId(inviteId),
    onSuccess: (result) => {
      if (result.emailSent) toast.success(copy.resendSuccess);
      else toast.info(inviteUserCopy.generatedOnly);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.invites(eventId) });
    },
    onError: (err) => toast.error(getErrorMessage(err, copy.resendError)),
    onSettled: () => setActiveResendId(null),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => adminRepo.revokeInvitation(inviteId),
    onMutate: (inviteId) => setActiveRevokeId(inviteId),
    onSuccess: () => {
      toast.success(copy.revokedSuccess);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.invites(eventId) });
    },
    onError: (err) => toast.error(getErrorMessage(err, copy.revokeError)),
    onSettled: () => setActiveRevokeId(null),
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    activeResendId,
    activeRevokeId,
    resend: (id: string) => resendMutation.mutate(id),
    revoke: (id: string) => revokeMutation.mutate(id),
  };
}

/** Lista de todos os convites gerados no painel de administração. */
export function AdminInvitationsList({ eventId }: Readonly<{ eventId: string }>) {
  const state = useAdminInvitations(eventId);

  if (state.isLoading) {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader className="space-y-1">
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription className="text-xs text-[var(--ink-muted)]">{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminStateMessage>{messages.common.loading}</AdminStateMessage>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    logFrontendError("AdminInvitationsList.query", state.error, { eventId });
    return (
      <Card className={CARD_CLASS}>
        <CardHeader className="space-y-1">
          <CardTitle>{copy.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminStateMessage
            tone="error"
            action={<Button onClick={() => void state.refetch()}>{messages.common.retry}</Button>}
          >
            {copy.loadError}
          </AdminStateMessage>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle>{copy.title}</CardTitle>
          <Badge variant="secondary" className="h-5 px-2 text-[10px]">
            {formatCount(state.invitations.length, copy.count, copy.counts)}
          </Badge>
        </div>
        <CardDescription className="text-xs text-[var(--ink-muted)]">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.invitations.length === 0 ? (
          <AdminStateMessage>{copy.empty}</AdminStateMessage>
        ) : (
          <ul className="divide-y divide-[var(--border-paper)]">
            {state.invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                onResend={state.resend}
                onRevoke={state.revoke}
                isResending={state.activeResendId === invitation.id}
                isRevoking={state.activeRevokeId === invitation.id}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
