"use client";

import { Eye, Gift, Lock, RefreshCw, Shuffle, Users } from "lucide-react";
import { useAdminMutation } from "../hooks/useAdminMutation";
import type { EventAdminSecretSantaStateDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADMIN_CONTENT_CARD_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
  AdminDetailPanel,
} from "../adminContentUi";

type SecretSantaAdminProps = {
  eventId: string;
  state: EventAdminSecretSantaStateDto;
  onRefresh: () => Promise<void>;
};

export function SecretSantaAdmin({
  eventId,
  state,
  onRefresh,
}: Readonly<SecretSantaAdminProps>) {
  const drawMutation = useAdminMutation({
    mutationFn: (payload?: unknown) => adminRepo.drawSecretSanta(eventId, payload),
    onSuccess: onRefresh,
    successMessage: "Sorteio realizado. Ainda ninguém o vê até o revelares.",
  });
  const revealMutation = useAdminMutation({
    mutationFn: () => adminRepo.revealSecretSanta(eventId),
    onSuccess: onRefresh,
    successMessage: "Sorteio revelado aos membros.",
  });

  const handleDraw = () => {
    if (state.hasDraw && !confirm("Repetir o sorteio apaga as atribuições atuais. Continuar?")) {
      return;
    }
    drawMutation.mutate({});
  };

  const handleReveal = () => {
    if (!confirm("Depois de revelado, cada membro vê o seu amigo secreto e o sorteio já não pode ser repetido. Revelar?")) {
      return;
    }
    revealMutation.mutate();
  };

  // A locked draw is a revealed one: members see it and it can no longer be repeated.
  const isLocked = state.isLocked;
  const isBusy = drawMutation.isPending || revealMutation.isPending;
  const canDraw = state.memberCount >= 2 && !isLocked;
  const canReveal = state.hasDraw && !isLocked;

  return (
    <div className="space-y-4">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="editorial-kicker">Logística</p>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Amigo Secreto
              </CardTitle>
            </div>
            {isLocked ? (
              <Badge variant="outline" className="gap-1.5 border-[rgba(255,255,255,0.1)] py-1">
                <Lock className="h-3 w-3" />
                Sorteio revelado
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-[var(--ink-muted)]">
            Gere as atribuições aleatórias para o Amigo Secreto deste evento.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDetailPanel className="space-y-2">
              <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Membros</span>
              </div>
              <p className="text-2xl font-bold text-[var(--ink-primary)]">{state.memberCount}</p>
              <p className="text-xs text-[var(--ink-muted)]">Participantes elegíveis no evento.</p>
            </AdminDetailPanel>

            <AdminDetailPanel className="space-y-2">
              <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
                <Shuffle className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Atribuições</span>
              </div>
              <p className="text-2xl font-bold text-[var(--ink-primary)]">{state.assignmentCount}</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {state.hasDraw ? "Sorteio já realizado." : "Aguardando sorteio inicial."}
              </p>
            </AdminDetailPanel>
          </div>

          <div className="space-y-4">
            {isLocked ? (
              <AdminDetailPanel className="border-amber-500/20 bg-amber-500/5">
                O sorteio já foi revelado aos membros e não pode ser repetido.
              </AdminDetailPanel>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleDraw}
                disabled={!canDraw || isBusy}
                className="min-h-12 flex-1 gap-2"
              >
                {drawMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
                {state.hasDraw ? "Repetir sorteio" : "Realizar sorteio"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReveal}
                disabled={!canReveal || isBusy}
                className={`${ADMIN_OUTLINE_BUTTON_CLASS} min-h-12 flex-1 gap-2`}
              >
                <Eye className="h-4 w-4" />
                Revelar aos membros
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => void onRefresh()}
                disabled={isBusy}
                className={`${ADMIN_OUTLINE_BUTTON_CLASS} min-h-12 gap-2`}
              >
                <RefreshCw className={cn("h-4 w-4", isBusy && "animate-spin")} />
                Sincronizar estado
              </Button>
            </div>

            {!canDraw && !isLocked ? (
              <p className="text-center text-xs text-[var(--neon-amber)]">
                São necessários pelo menos 2 membros para realizar o sorteio.
              </p>
            ) : null}
          </div>

          {state.hasDraw ? (
            <div className="rounded-[var(--radius-lg-token)] border border-[rgba(var(--neon-green-rgb),0.15)] bg-[rgba(var(--neon-green-rgb),0.02)] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[var(--neon-green)] p-1.5">
                  <Lock className="h-3 w-3 text-black" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--neon-green)]">
                    {isLocked ? "Sorteio revelado" : "Sorteio por revelar"}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {isLocked
                      ? "Cada membro já vê o seu amigo secreto na secção Amigo Secreto."
                      : "As atribuições existem, mas os membros só as veem depois de revelares. Podes repetir o sorteio até lá."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
