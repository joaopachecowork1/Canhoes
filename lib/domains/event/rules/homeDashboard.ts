import type { EventModulesDto, EventPhaseDto } from "@/lib/api/types";
import { CANHOES_MODULES, type CanhoesModule } from "@/lib/modules";

// Área que é o "próximo passo" em cada fase.
const PHASE_MODULES: Record<string, string> = {
  DRAW: "secretSanta",
  PROPOSALS: "nominees",
  VOTING: "voting",
  RESULTS: "gala",
};

// Número máximo de atalhos mostrados além do próximo passo.
const SHORTCUT_COUNT = 3;

/**
 * O "próximo passo" do painel inicial (a área aberta da fase ativa, senão a wishlist) e até três
 * outras áreas abertas como atalhos. O mural é a própria página inicial, por isso nunca é atalho.
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
