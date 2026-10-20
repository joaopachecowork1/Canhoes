import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getEventOverview } from "@/lib/domains/event/services/event";

/** GET /v1/events/:eventId/overview: devolve a visão geral do evento (fase, áreas abertas) */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const overview = await getEventOverview(eventId, user.id, user.isAdmin);
  if (!overview) throw notFound("Event not found.");
  return json(overview);
});
