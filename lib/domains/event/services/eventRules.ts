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

export function resolveMemberModules(state: EventRulesState): EventModulesDto {
  const phase = state.activePhaseType;
  const isOn = (key: AdminModuleKey) => state.moduleVisibility[key] ?? true;
  const isProposals = phase === "PROPOSALS";
  const isVoting = phase === "VOTING";
  const isResults = phase === "RESULTS";

  return {
    feed: isOn("feed"),
    secretSanta: isOn("secretSanta") && (phase === "DRAW" || state.hasSecretSantaDraw || isVoting || isResults),
    wishlist: isOn("wishlist"),
    categories: isOn("categories") && (isProposals || isVoting || isResults),
    voting: isOn("voting") && isVoting,
    gala: isOn("gala") && isResults,
    stickers: isOn("stickers") && isProposals && state.nominationsVisible,
    measures: isOn("measures") && isProposals && state.nominationsVisible,
    nominees: isOn("nominees") && (state.nominationsVisible || isResults),
    admin: false,
  };
}

export const ALL_MODULES: EventModulesDto = {
  feed: true, secretSanta: true, wishlist: true, categories: true, voting: true,
  gala: true, stickers: true, measures: true, nominees: true, admin: true,
};

/** Category proposals, nominations, stickers and measures are only accepted while proposals are open. */
export function canSubmitProposals(state: EventRulesState) {
  return state.activePhaseType === "PROPOSALS" && state.nominationsVisible;
}

/** Votes count only inside the active voting phase's dates. */
export function isVotingOpen(votingPhase: VotingWindow | null, now: Date) {
  return votingPhase !== null && now >= votingPhase.startDateUtc && now <= votingPhase.endDateUtc;
}
