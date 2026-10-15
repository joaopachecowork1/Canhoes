import { z } from "zod";

import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { updateAdminPhase } from "@/lib/domains/admin/services/state";
import { PHASE_TYPES } from "@/lib/domains/event/services/eventRules";

const phaseSchema = z.object({
  phaseType: z.enum(PHASE_TYPES, { error: "PhaseType must be DRAW, PROPOSALS, VOTING or RESULTS." }),
});

export const PUT = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  await requireAdmin();
  const { phaseType } = await readJson(request, phaseSchema);
  return json(await updateAdminPhase(eventId, phaseType));
});
