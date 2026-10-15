export const OPEN_COMPOSE_SHEET_EVENT = "canhoes:openCompose";

// --- Phase helpers ---
export function getPhaseLabel(phaseType?: string | null) {
  switch (phaseType) {
    case "DRAW":
      return "Sorteio";
    case "PROPOSALS":
      return "Propostas";
    case "VOTING":
      return "Votação";
    case "RESULTS":
      return "Resultados";
    default:
      return "Sem fase";
  }
}
