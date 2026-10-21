import type { EventActiveContextDto, EventModulesDto } from "@/lib/api/types";

/** An active edition in `phaseType`, with the given areas open, as the shell receives it. */
export function makeEventContext({
  isAdmin = false,
  modules = {},
  phaseType = "PROPOSALS",
  canSubmitProposal = phaseType === "PROPOSALS",
}: {
  canSubmitProposal?: boolean;
  isAdmin?: boolean;
  modules?: EventModulesDto;
  phaseType?: string;
} = {}): EventActiveContextDto {
  const event = { id: "event-1", name: "Canhões 2026", isActive: true };
  return {
    event,
    overview: {
      event,
      activePhase: { id: "phase-1", type: phaseType, isActive: true },
      permissions: { isAdmin, canSubmitProposal, canVote: phaseType === "VOTING" },
      modules,
    },
  };
}
