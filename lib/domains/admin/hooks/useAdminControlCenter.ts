import { useState } from "react";
import { toast } from "sonner";

import type { AdminModuleKey, EventAdminStateDto } from "@/lib/api/types";
import { getPhaseLabel } from "@/lib/canhoesEvent";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { CANHOES_MODULES, type CanhoesModule } from "@/lib/modules";
import { formatMessage } from "@/lib/messages";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";

const copy = messages.admin.useAdminControlCenter;

export type AdminModuleItem = CanhoesModule & {
  /** O interruptor do admin: desligado esconde a área em todas as fases. */
  isEnabled: boolean;
  /** Se os membros a veem neste momento (interruptor e fase em conjunto). */
  isOpenNow: boolean;
};

/** "event", "phase", "proposals" ou a chave de uma área: o controlo que está a gravar. */
type SavingKey = "event" | "phase" | "proposals" | AdminModuleKey;

/**
 * Estado e ações do separador "Evento" do admin: evento ativo, fase, interruptor das propostas e
 * interruptores por área. Cada ação grava e depois `onRefresh` recarrega o estado do admin.
 */
export function useAdminControlCenter(
  eventId: string | null,
  state: EventAdminStateDto | null,
  onRefresh: () => Promise<void>,
) {
  const [savingKey, setSavingKey] = useState<SavingKey | null>(null);

  // Grava, recarrega o estado e avisa; `savingKey` marca o controlo ocupado até ao fim, com ou sem erro.
  async function save(
    key: SavingKey,
    action: () => Promise<unknown>,
    { success, failure }: Readonly<{ success: string; failure: string }>,
  ) {
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
    void save("event", () => adminRepo.activateEvent(nextEventId), {
      success: copy.eventActivated,
      failure: copy.eventError,
    });
  };

  const handleUpdatePhase = (phaseType: string) => {
    if (!eventId || phaseType === state?.activePhase?.type) return;
    void save("phase", () => adminRepo.updatePhase(eventId, { phaseType }), {
      success: formatMessage(copy.phaseChanged, { phase: getPhaseLabel(phaseType) }),
      failure: copy.phaseError,
    });
  };

  const handleProposalsOpen = (isOpen: boolean) => {
    if (!eventId) return;
    void save("proposals", () => adminRepo.updateAdminState(eventId, { nominationsVisible: isOpen }), {
      success: isOpen ? copy.proposalsOpened : copy.proposalsClosed,
      failure: copy.saveError,
    });
  };

  const handleModuleToggle = (module: CanhoesModule, isEnabled: boolean) => {
    if (!eventId) return;
    void save(module.key, () => adminRepo.updateModules(eventId, { [module.key]: isEnabled }), {
      success: formatMessage(isEnabled ? copy.moduleOn : copy.moduleOff, { module: module.label }),
      failure: copy.saveError,
    });
  };

  // Sem estado carregado, uma área conta como ligada (é o valor por defeito no servidor).
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
