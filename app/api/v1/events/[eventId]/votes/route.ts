import { requireModule, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { castVote } from "@/lib/domains/voting/services/voting";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { CreateEventVoteSchema } from "@/lib/zod/voting";

/** POST /v1/events/:eventId/votes: regista o voto do utilizador numa categoria */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "strict");
  // Exige sessão iniciada e a área aberta.
  const user = await requireUser();
  await requireModule(eventId, user, "voting");

  // Valida o corpo do pedido.
  const { categoryId, selectionId } = await readJson(request, CreateEventVoteSchema);

  return json(await castVote(eventId, user.id, categoryId, selectionId));
});
