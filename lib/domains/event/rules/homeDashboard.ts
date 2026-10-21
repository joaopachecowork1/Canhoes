import type { EventModulesDto, EventPhaseDto } from "@/lib/api/types";
import { CANHOES_MODULES, type CanhoesModule } from "@/lib/modules";

// Área que é o "próximo passo" em cada fase.
const PHASE_MODULES: Record<string, string> = {
  DRAW: "secretSanta",
  PROPOSALS: "nominees",
  VOTING: "voting",
  RESULTS: "gala",
};

/** Um atalho para uma área do evento na faixa rápida do mural, com indicação se está aberta. */
export type DashboardShortcut = CanhoesModule & {
  isOpen: boolean;
};

/**
 * O "próximo passo" do painel inicial (a área aberta da fase ativa, senão a wishlist) e todos os
 * outros módulos da edição como atalhos da faixa rápida, ordenando os abertos primeiro.
 */
export function pickDashboardModules(
  modules: EventModulesDto,
  activePhaseType: EventPhaseDto["type"] | undefined,
): { nextStep: CanhoesModule | undefined; shortcuts: DashboardShortcut[] } {
  const isOpen = (module: CanhoesModule) => Boolean(modules[module.key]);
  const phaseModuleKey = activePhaseType ? PHASE_MODULES[activePhaseType] : undefined;

  const nextStep =
    CANHOES_MODULES.find((module) => module.key === phaseModuleKey && isOpen(module)) ??
    CANHOES_MODULES.find((module) => module.key === "wishlist" && isOpen(module));

  const candidateModules = CANHOES_MODULES.filter((module) => module.key !== "feed" && module.key !== nextStep?.key);

  const shortcuts: DashboardShortcut[] = candidateModules
    .map((module) => ({
      ...module,
      isOpen: isOpen(module),
    }))
    .sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;
      return 0;
    });

  return { nextStep, shortcuts };
}
