import type { EventModulesDto, EventPhaseDto } from "@/lib/api/types";
import { CANHOES_MODULES, type CanhoesModule } from "@/lib/modules";

const PHASE_MODULES: Record<string, string> = {
  DRAW: "secretSanta",
  PROPOSALS: "nominees",
  VOTING: "voting",
  RESULTS: "gala",
};

const SHORTCUT_COUNT = 3;

/**
 * The home dashboard's "next step" (the open area of the active phase, else the wishlist) and up to
 * three other open areas as shortcuts. The mural is the home itself, so it is never a shortcut.
 */
export function pickDashboardModules(
  modules: EventModulesDto,
  activePhaseType: EventPhaseDto["type"] | undefined,
): { nextStep: CanhoesModule | undefined; shortcuts: CanhoesModule[] } {
  const isOpen = (module: CanhoesModule) => Boolean(modules[module.key]);
  const phaseModuleKey = activePhaseType ? PHASE_MODULES[activePhaseType] : undefined;

  const nextStep =
    CANHOES_MODULES.find((module) => module.key === phaseModuleKey && isOpen(module)) ??
    CANHOES_MODULES.find((module) => module.key === "wishlist" && isOpen(module));

  const shortcuts = CANHOES_MODULES.filter(
    (module) => module.key !== "feed" && module.key !== nextStep?.key && isOpen(module),
  ).slice(0, SHORTCUT_COUNT);

  return { nextStep, shortcuts };
}
