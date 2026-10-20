import { requireModule, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getResults } from "@/lib/domains/voting/services/results";

/** GET /v1/events/:eventId/results: devolve os resultados da gala */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e a área aberta.
  const user = await requireUser();
  await requireModule(eventId, user, "gala");

  return json(await getResults(eventId));
});
