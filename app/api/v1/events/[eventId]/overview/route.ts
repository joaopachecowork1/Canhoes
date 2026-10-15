import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getEventOverview } from "@/lib/domains/event/services/event";

export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const overview = await getEventOverview(eventId, user.id, user.isAdmin);
  if (!overview) throw notFound("Event not found.");
  return json(overview);
});
