import messages from "@/messages/pt.json";

export const OPEN_COMPOSE_SHEET_EVENT = "canhoes:openCompose";

// --- Phase helpers ---
export function getPhaseLabel(phaseType?: string | null) {
  switch (phaseType) {
    case "DRAW":
      return messages.phases.DRAW;
    case "PROPOSALS":
      return messages.phases.PROPOSALS;
    case "VOTING":
      return messages.phases.VOTING;
    case "RESULTS":
      return messages.phases.RESULTS;
    default:
      return messages.phases.none;
  }
}
