import type { AdminModuleKey, EventModulesDto } from "@/lib/api/types";

/**
 * O que os membros podem ver e fazer num evento, a partir da fase ativa e dos interruptores do admin.
 * Puro de propósito: a visão geral (o que a UI mostra) e as guardas das rotas (o que o servidor
 * aceita) leem estas regras, por isso não se afastam uma da outra. Os admins ignoram-nas.
 */
export type EventRulesState = {
  activePhaseType: string | null;
  /** Interruptores do admin por área; uma chave em falta significa visível. */
  moduleVisibility: Partial<Record<AdminModuleKey, boolean>>;
  nominationsVisible: boolean;
  hasSecretSantaDraw: boolean;
};

/** As etapas de uma edição, por ordem (`EventPhase.type`). */
export const PHASE_TYPES = ["DRAW", "PROPOSALS", "VOTING", "RESULTS"] as const;
/** Uma das fases de `PHASE_TYPES`. */
export type PhaseType = (typeof PHASE_TYPES)[number];

/** Janela de datas (UTC) em que a votação conta. */
export type VotingWindow = { startDateUtc: Date; endDateUtc: Date };

/**
 * As áreas abertas aos membros neste momento. Cada área só abre na fase em que tem algo para fazer,
 * para a navegação nunca listar uma área que diria apenas "fechado": tudo o que recebe propostas
 * (categorias, nomeações, stickers, medidas) abre em PROPOSALS, o boletim em VOTING e a gala em
 * RESULTS. O mural e a wishlist estão sempre abertos.
 */
export function resolveMemberModules(state: EventRulesState): EventModulesDto {
  const phase = state.activePhaseType;
  const isOn = (key: AdminModuleKey) => state.moduleVisibility[key] ?? true;
  const isTakingProposals = canSubmitProposals(state);

  return {
    feed: isOn("feed"),
    secretSanta: isOn("secretSanta") && hasSecretSantaStarted(state),
    wishlist: isOn("wishlist"),
    categories: isOn("categories") && isTakingProposals,
    voting: isOn("voting") && phase === "VOTING",
    gala: isOn("gala") && phase === "RESULTS",
    stickers: isOn("stickers") && isTakingProposals,
    measures: isOn("measures") && isTakingProposals,
    nominees: isOn("nominees") && isTakingProposals,
    admin: false,
  };
}

/** O amigo secreto abre com a fase do sorteio e fica aberto depois de haver sorteio ou quando a gala se aproxima. */
function hasSecretSantaStarted(state: EventRulesState) {
  const phase = state.activePhaseType;
  return phase === "DRAW" || phase === "VOTING" || phase === "RESULTS" || state.hasSecretSantaDraw;
}

/** O que fica visível quando uma fase passa a ativa: as nomeações só durante PROPOSALS e os resultados só durante RESULTS. */
export function phaseSwitches(phaseType: PhaseType) {
  return { nominationsVisible: phaseType === "PROPOSALS", resultsVisible: phaseType === "RESULTS" };
}

/** Propostas de categoria, nomeações, stickers e medidas só são aceites enquanto as propostas estão abertas. */
export function canSubmitProposals(state: EventRulesState) {
  return state.activePhaseType === "PROPOSALS" && state.nominationsVisible;
}

/** Os votos só contam dentro das datas da fase de votação ativa. */
export function isVotingOpen(votingPhase: VotingWindow | null, now: Date) {
  return votingPhase !== null && now >= votingPhase.startDateUtc && now <= votingPhase.endDateUtc;
}

/** Lê os interruptores de área guardados em `CanhoesEventState.moduleVisibilityJson`, mantendo só valores ligado/desligado. */
export function readModuleSwitches(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}
