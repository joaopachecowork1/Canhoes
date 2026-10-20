import type { AdminModuleKey, EventModulesDto } from "@/lib/api/types";

/**
 * What members may see and do in an event, from its active phase and the admin's switches.
 * Pure on purpose: the overview (what the UI shows) and the route guards (what the server
 * accepts) both read these rules, so they cannot drift apart. Admins bypass them.
 */
export type EventRulesState = {
  activePhaseType: string | null;
  /** Admin toggles per module; a missing key means visible. */
  moduleVisibility: Partial<Record<AdminModuleKey, boolean>>;
  nominationsVisible: boolean;
  hasSecretSantaDraw: boolean;
};

/** The stages of an edition, in order (`EventPhase.type`). */
export const PHASE_TYPES = ["DRAW", "PROPOSALS", "VOTING", "RESULTS"] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];

export type VotingWindow = { startDateUtc: Date; endDateUtc: Date };

/**
 * The modules open to members right now. Each module only opens in the phase where it has
 * something to do, so the navigation never lists an area that would only say "closed":
 * everything that takes proposals (categories, nominations, stickers, measures) opens in
 * PROPOSALS, the ballot in VOTING and the gala in RESULTS. Feed and wishlist are always open.
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

/** The secret santa opens with the draw phase and stays open once there is a draw or the gala nears. */
function hasSecretSantaStarted(state: EventRulesState) {
  const phase = state.activePhaseType;
  return phase === "DRAW" || phase === "VOTING" || phase === "RESULTS" || state.hasSecretSantaDraw;
}

/** Category proposals, nominations, stickers and measures are only accepted while proposals are open. */
export function canSubmitProposals(state: EventRulesState) {
  return state.activePhaseType === "PROPOSALS" && state.nominationsVisible;
}

/** Votes count only inside the active voting phase's dates. */
export function isVotingOpen(votingPhase: VotingWindow | null, now: Date) {
  return votingPhase !== null && now >= votingPhase.startDateUtc && now <= votingPhase.endDateUtc;
}

/** The module switches saved in `CanhoesEventState.moduleVisibilityJson`, keeping only on/off values. */
export function readModuleSwitches(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}
