import messages from "@/messages/pt.json";

/** Nome do evento do browser que abre a folha de criar publicação. */
export const OPEN_COMPOSE_SHEET_EVENT = "canhoes:openCompose";

/** O nome em português de uma fase (`DRAW`, `PROPOSALS`, `VOTING`, `RESULTS`) para mostrar na UI. */
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
