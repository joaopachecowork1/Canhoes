import { requireEventAccess, requireProposalsOpen, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createMeasureProposal, getMeasures } from "@/lib/domains/members/services/measures";
import { CreateMeasureProposalSchema } from "@/lib/zod/nomination";

/** GET /v1/events/:eventId/measures: lista as medidas */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  return json(await getMeasures(eventId));
});

/** POST /v1/events/:eventId/measures: propõe uma medida */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Exige sessão iniciada e a fase de propostas aberta.
  const user = await requireUser();
  await requireProposalsOpen(eventId, user);

  // Valida o corpo do pedido.
  const { text } = await readJson(request, CreateMeasureProposalSchema);

  return json(await createMeasureProposal(eventId, user.id, text));
});
