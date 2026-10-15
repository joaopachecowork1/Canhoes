import { useState } from "react";
import { toast } from "sonner";

import type { AdminModuleKey, EventAdminStateDto } from "@/lib/api/types";
import { getPhaseLabel } from "@/lib/canhoesEvent";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { CANHOES_MODULES, type CanhoesModule } from "@/lib/modules";
import { adminRepo } from "@/lib/repositories/adminRepo";

export type AdminModuleItem = CanhoesModule & {
  /** The admin switch: off hides the module in every phase. */
  isEnabled: boolean;
  /** Whether members see it right now (switch and phase together). */
  isOpenNow: boolean;
};

/** "event", "phase", "proposals" or a module key: the control currently saving. */
type SavingKey = "event" | "phase" | "proposals" | AdminModuleKey;

/**
 * State and actions of the admin "Evento" tab: active event, phase, the proposals switch and
 * the per-module switches. Every action saves, then `onRefresh` reloads the admin state.
 */
export function useAdminControlCenter(
  eventId: string | null,
  state: EventAdminStateDto | null,
  onRefresh: () => Promise<void>
) {
  const [savingKey, setSavingKey] = useState<SavingKey | null>(null);

  async function save(key: SavingKey, action: () => Promise<unknown>, success: string, failure: string) {
    setSavingKey(key);
    try {
      await action();
      await onRefresh();
      toast.success(success);
    } catch (error) {
      logFrontendError("AdminControlCenter.save", error, { key });
      toast.error(getErrorMessage(error, failure));
    } finally {
      setSavingKey(null);
    }
  }

  const handleActivateEvent = (nextEventId: string) => {
    if (!nextEventId || nextEventId === eventId) return;
    void save("event", () => adminRepo.activateEvent(nextEventId), "Evento ativo atualizado.", "Não foi possível mudar o evento ativo.");
  };

  const handleUpdatePhase = (phaseType: string) => {
    if (!eventId || phaseType === state?.activePhase?.type) return;
    void save(
      "phase",
      () => adminRepo.updatePhase(eventId, { phaseType }),
      `Fase mudada para ${getPhaseLabel(phaseType)}.`,
      "Não foi possível mudar a fase."
    );
  };

  const handleProposalsOpen = (isOpen: boolean) => {
    if (!eventId) return;
    void save(
      "proposals",
      () => adminRepo.updateAdminState(eventId, { nominationsVisible: isOpen }),
      isOpen ? "Propostas abertas." : "Propostas fechadas.",
      "Não foi possível guardar."
    );
  };

  const handleModuleToggle = (module: CanhoesModule, isEnabled: boolean) => {
    if (!eventId) return;
    void save(
      module.key,
      () => adminRepo.updateModules(eventId, { [module.key]: isEnabled }),
      `${module.label} ${isEnabled ? "ligado" : "desligado"}.`,
      "Não foi possível guardar."
    );
  };

  const moduleItems: AdminModuleItem[] = CANHOES_MODULES.map((module) => ({
    ...module,
    isEnabled: state?.moduleVisibility[module.key] ?? true,
    isOpenNow: Boolean(state?.effectiveModules[module.key]),
  }));

  return {
    moduleItems,
    savingKey,
    handleActivateEvent,
    handleModuleToggle,
    handleProposalsOpen,
    handleUpdatePhase,
  };
}
