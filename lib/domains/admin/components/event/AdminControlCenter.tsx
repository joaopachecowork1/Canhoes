"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { EventAdminStateDto } from "@/lib/api/types";
import { getPhaseLabel } from "@/lib/canhoesEvent";
import { PHASE_TYPES } from "@/lib/domains/event/rules/eventRules";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
  ADMIN_CONTENT_CARD_CLASS,
} from "../adminContentUi";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import { useAdminControlCenter, type AdminModuleItem } from "../../hooks/useAdminControlCenter";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.admin.AdminControlCenter;

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
    return <AdminStateMessage variant="panel">{copy.noEvent}</AdminStateMessage>;
  }

  return (
    <div className="space-y-3">
      <EventSettingsCard control={control} eventId={eventId} events={events} loading={loading} state={state} />
      <ModulesCard control={control} />
    </div>
  );
}

type Control = ReturnType<typeof useAdminControlCenter>;

function EventSettingsCard({
  control,
  eventId,
  events,
  loading,
  state,
}: Readonly<Omit<AdminControlCenterProps, "onRefresh" | "state"> & { control: Control; state: EventAdminStateDto }>) {
  return (
    <Card className={ADMIN_CONTENT_CARD_CLASS}>
      <CardContent className="space-y-4 p-4">
        <Field label={copy.activeEvent}>
          <Select
            value={eventId ?? ""}
            onValueChange={control.handleActivateEvent}
            disabled={control.savingKey === "event" || events.length === 0}
          >
            <SelectTrigger aria-label={copy.activeEvent} className="h-11">
              <SelectValue placeholder={copy.chooseEvent} />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={copy.phase}>
          <Select
            value={state.activePhase?.type ?? ""}
            onValueChange={control.handleUpdatePhase}
            disabled={control.savingKey === "phase" || loading}
          >
            <SelectTrigger aria-label={copy.phase} className="h-11">
              <SelectValue placeholder={copy.choosePhase} />
            </SelectTrigger>
            <SelectContent>
              {PHASE_TYPES.map((phase) => (
                <SelectItem key={phase} value={phase}>
                  {getPhaseLabel(phase)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="proposals-open" className="text-base font-semibold">
              {copy.acceptProposals}
            </Label>
            <p className="text-sm text-[var(--color-text-muted)]">{copy.acceptProposalsHint}</p>
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
  );
}

function ModulesCard({ control }: Readonly<{ control: Control }>) {
  return (
    <Card className={ADMIN_CONTENT_CARD_CLASS}>
      <CardContent className="space-y-1 p-2">
        <div className="px-2 pb-1 pt-2">
          <h2 className="text-base font-semibold">{copy.areasTitle}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{copy.areasHint}</p>
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
  let status = formatMessage(copy.opensIn, { phase: module.opensIn });
  if (!module.isEnabled) status = copy.disabled;
  else if (module.isOpenNow) status = copy.openNow;

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
        aria-label={formatMessage(copy.moduleSwitchLabel, { module: module.label })}
        variant="admin"
        checked={module.isEnabled}
        disabled={isSaving}
        onCheckedChange={onToggle}
      />
    </div>
  );
}
