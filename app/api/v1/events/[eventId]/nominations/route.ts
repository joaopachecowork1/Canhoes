import { requireProposalsOpen, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createNomination } from "@/lib/domains/members/services/nominations";
import { CreateNomineeSchema } from "@/lib/zod/nomination";

/** POST /v1/events/:eventId/nominations: propõe um nomeado */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Exige sessão iniciada e a fase de propostas aberta.
  const user = await requireUser();
  await requireProposalsOpen(eventId, user);

  // Valida o corpo do pedido.
  const nomination = await readJson(request, CreateNomineeSchema);

  return json(await createNomination(eventId, user.id, nomination));
});
