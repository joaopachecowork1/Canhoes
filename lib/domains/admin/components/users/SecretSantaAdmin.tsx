"use client";

import type { LucideIcon } from "lucide-react";
import { Eye, Gift, Lock, RefreshCw, Shuffle, Users } from "lucide-react";

import type { EventAdminSecretSantaStateDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import messages from "@/messages/pt.json";

import { useAdminMutation } from "../../hooks/useAdminMutation";
import { ADMIN_CONTENT_CARD_CLASS, AdminDetailPanel } from "../adminContentUi";

const copy = messages.admin.SecretSantaAdmin;
const MIN_MEMBERS_FOR_DRAW = 2;

type SecretSantaAdminProps = {
  eventId: string;
  state: EventAdminSecretSantaStateDto;
  onRefresh: () => Promise<void>;
};

/** Painel com um número em destaque (membros, atribuições) e uma nota. */
function StatPanel({
  hint,
  icon: Icon,
  label,
  value,
}: Readonly<{ hint: string; icon: LucideIcon; label: string; value: number }>) {
  return (
    <AdminDetailPanel className="space-y-2">
      <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--ink-primary)]">{value}</p>
      <p className="text-xs text-[var(--ink-muted)]">{hint}</p>
    </AdminDetailPanel>
  );
}

/** Se o sorteio ainda está escondido dos membros (e pode repetir-se) ou já foi revelado. */
function DrawStatus({ isLocked }: Readonly<{ isLocked: boolean }>) {
  return (
    <div className="rounded-[var(--radius-lg-token)] border border-[var(--moss)]/20 bg-[var(--moss)]/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[var(--moss-glow)] p-1.5">
          <Lock className="h-3 w-3 text-black" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--moss-glow)]">{isLocked ? copy.revealed : copy.notRevealed}</p>
          <p className="text-xs text-[var(--ink-muted)]">{isLocked ? copy.revealedHint : copy.notRevealedHint}</p>
        </div>
      </div>
    </div>
  );
}

/** Ações do admin sobre o sorteio (sortear, repetir, revelar), cada uma com confirmação quando é destrutiva. */
function useSecretSantaActions({ eventId, state, onRefresh }: Readonly<SecretSantaAdminProps>) {
  const drawMutation = useAdminMutation({
    mutationFn: (payload?: unknown) => adminRepo.drawSecretSanta(eventId, payload),
    onSuccess: onRefresh,
    successMessage: copy.drawn,
  });
  const revealMutation = useAdminMutation({
    mutationFn: () => adminRepo.revealSecretSanta(eventId),
    onSuccess: onRefresh,
    successMessage: copy.revealedToast,
  });

  return {
    isDrawing: drawMutation.isPending,
    isBusy: drawMutation.isPending || revealMutation.isPending,
    handleDraw: () => {
      // repetir o sorteio apaga o anterior, por isso pede confirmação
      if (state.hasDraw && !confirm(copy.redrawConfirm)) return;
      drawMutation.mutate({});
    },
    handleReveal: () => {
      // revelar é definitivo: depois disso o sorteio já não se repete
      if (!confirm(copy.revealConfirm)) return;
      revealMutation.mutate();
    },
  };
}

/** Botões de sortear/repetir, revelar e sincronizar. */
function DrawActions({
  actions,
  canDraw,
  canReveal,
  hasDraw,
  onRefresh,
}: Readonly<{
  actions: ReturnType<typeof useSecretSantaActions>;
  canDraw: boolean;
  canReveal: boolean;
  hasDraw: boolean;
  onRefresh: () => Promise<void>;
}>) {
  const DrawIcon = actions.isDrawing ? RefreshCw : Shuffle;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        onClick={actions.handleDraw}
        disabled={!canDraw || actions.isBusy}
        className="min-h-12 flex-1 gap-2"
      >
        <DrawIcon className={cn("h-4 w-4", actions.isDrawing && "animate-spin")} />
        {hasDraw ? copy.redraw : copy.draw}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={actions.handleReveal}
        disabled={!canReveal || actions.isBusy}
        className="min-h-12 flex-1 gap-2"
      >
        <Eye className="h-4 w-4" />
        {copy.reveal}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void onRefresh()}
        disabled={actions.isBusy}
        className="min-h-12 gap-2"
      >
        <RefreshCw className={cn("h-4 w-4", actions.isBusy && "animate-spin")} />
        {copy.sync}
      </Button>
    </div>
  );
}

/** Cartão do amigo secreto no admin: estado do sorteio e ações para sortear e revelar. */
export function SecretSantaAdmin(props: Readonly<SecretSantaAdminProps>) {
  const { state, onRefresh } = props;
  const actions = useSecretSantaActions(props);
  // um sorteio bloqueado é um sorteio revelado: os membros veem-no e já não se pode repetir
  const isLocked = state.isLocked;
  const canDraw = state.memberCount >= MIN_MEMBERS_FOR_DRAW && !isLocked;

  return (
    <div className="space-y-4">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                {messages.secretSanta.CanhoesSecretSantaModule.title}
              </CardTitle>
            </div>
            {isLocked ? (
              <Badge variant="outline" className="gap-1.5 border-[var(--color-veil)]/10 py-1">
                <Lock className="h-3 w-3" />
                {copy.revealed}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-[var(--ink-muted)]">{copy.description}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatPanel icon={Users} label={copy.membersLabel} value={state.memberCount} hint={copy.membersHint} />
            <StatPanel
              icon={Shuffle}
              label={copy.assignmentsLabel}
              value={state.assignmentCount}
              hint={state.hasDraw ? copy.drawDone : copy.drawPending}
            />
          </div>

          <div className="space-y-4">
            {isLocked ? (
              <AdminDetailPanel className="border-[var(--person-amber)]/30 bg-[var(--person-amber)]/5">
                {copy.lockedNotice}
              </AdminDetailPanel>
            ) : null}
            <DrawActions
              actions={actions}
              canDraw={canDraw}
              canReveal={state.hasDraw && !isLocked}
              hasDraw={state.hasDraw}
              onRefresh={onRefresh}
            />
            {!canDraw && !isLocked ? (
              <p className="text-center text-xs text-[var(--person-amber)]">{copy.notEnoughMembers}</p>
            ) : null}
          </div>

          {state.hasDraw ? <DrawStatus isLocked={isLocked} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
