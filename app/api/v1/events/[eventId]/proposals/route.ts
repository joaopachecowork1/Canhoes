import { requireProposalsOpen, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createProposal } from "@/lib/domains/voting/services/voting";
import { CreateEventProposalSchema } from "@/lib/zod/voting";

/** POST /v1/events/:eventId/proposals: propõe uma categoria */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Exige sessão iniciada e a fase de propostas aberta.
  const user = await requireUser();
  await requireProposalsOpen(eventId, user);

  // Valida o corpo do pedido.
  const { name, description, kind } = await readJson(request, CreateEventProposalSchema);

  return json(await createProposal(eventId, user.id, { name, description, kind }));
});
