"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { EventAdminStateDto } from "@/lib/api/types";
import { getPhaseLabel } from "@/lib/canhoesEvent";
import { PHASE_TYPES } from "@/lib/domains/event/services/eventRules";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
  ADMIN_CONTENT_CARD_CLASS,
  ADMIN_SELECT_CONTENT_CLASS,
  ADMIN_SELECT_ITEM_CLASS,
  ADMIN_SELECT_TRIGGER_CLASS,
} from "../adminContentUi";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import { useAdminControlCenter, type AdminModuleItem } from "../hooks/useAdminControlCenter";

type AdminControlCenterProps = {
  eventId: string | null;
  events: Array<{ id: string; name: string }>;
  loading: boolean;
  onRefresh: () => Promise<void>;
  state: EventAdminStateDto | null;
};

/**
 * The admin "Evento" tab: which edition is active, its phase, whether proposals are open, and
 * every member area with its switch and a link. The link opens the area even when the phase has
 * it closed, so admins reach from here what members no longer see in the menu.
 */
export function AdminControlCenter({ eventId, events, loading, onRefresh, state }: Readonly<AdminControlCenterProps>) {
  const control = useAdminControlCenter(eventId, state, onRefresh);

  if (!state) {
    return <AdminStateMessage variant="panel">Falta uma edição ativa para abrir os controlos.</AdminStateMessage>;
  }

  return (
    <div className="space-y-3">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardContent className="space-y-4 p-4">
          <Field label="Evento ativo">
            <Select
              value={eventId ?? ""}
              onValueChange={control.handleActivateEvent}
              disabled={control.savingKey === "event" || events.length === 0}
            >
              <SelectTrigger aria-label="Evento ativo" className={`${ADMIN_SELECT_TRIGGER_CLASS} h-11`}>
                <SelectValue placeholder="Escolher evento" />
              </SelectTrigger>
              <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} className={ADMIN_SELECT_ITEM_CLASS}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Fase">
            <Select
              value={state.activePhase?.type ?? ""}
              onValueChange={control.handleUpdatePhase}
              disabled={control.savingKey === "phase" || loading}
            >
              <SelectTrigger aria-label="Fase" className={`${ADMIN_SELECT_TRIGGER_CLASS} h-11`}>
                <SelectValue placeholder="Escolher fase" />
              </SelectTrigger>
              <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
                {PHASE_TYPES.map((phase) => (
                  <SelectItem key={phase} value={phase} className={ADMIN_SELECT_ITEM_CLASS}>
                    {getPhaseLabel(phase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="proposals-open" className="text-base font-semibold">
                Aceitar propostas
              </Label>
              <p className="text-sm text-[var(--color-text-muted)]">
                Na fase de propostas, desliga para fechar categorias, nomeações, stickers e medidas.
              </p>
            </div>
            <Switch
              id="proposals-open"
              variant="admin"
              checked={state.nominationsVisible}
              disabled={control.savingKey === "proposals"}
              onCheckedChange={control.handleProposalsOpen}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardContent className="space-y-1 p-2">
          <div className="px-2 pb-1 pt-2">
            <h2 className="text-base font-semibold">Áreas dos membros</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Cada área abre na sua fase. Desliga uma para a esconder sempre.
            </p>
          </div>
          {control.moduleItems.map((module) => (
            <ModuleRow
              key={module.key}
              module={module}
              isSaving={control.savingKey === module.key}
              onToggle={(isEnabled) => control.handleModuleToggle(module, isEnabled)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ children, label }: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</p>
      {children}
    </div>
  );
}

function ModuleRow({
  isSaving,
  module,
  onToggle,
}: Readonly<{ isSaving: boolean; module: AdminModuleItem; onToggle: (isEnabled: boolean) => void }>) {
  const Icon = module.icon;
  let status = `Abre em: ${module.opensIn}`;
  if (!module.isEnabled) status = "Desligada";
  else if (module.isOpenNow) status = "Aberta agora";

  return (
    <div className="flex min-h-14 items-center gap-2 rounded-xl px-2">
      <Link
        href={module.href}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg hover:bg-[var(--bg-paper)]"
      >
        <Icon className="h-5 w-5 shrink-0 text-[var(--moss-glow)]" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium">{module.label}</span>
          <span
            className={cn(
              "block text-sm",
              module.isOpenNow ? "text-[var(--moss-glow)]" : "text-[var(--color-text-muted)]"
            )}
          >
            {status}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
      </Link>
      <Switch
        aria-label={`${module.label} ligada`}
        variant="admin"
        checked={module.isEnabled}
        disabled={isSaving}
        onCheckedChange={onToggle}
      />
    </div>
  );
}
