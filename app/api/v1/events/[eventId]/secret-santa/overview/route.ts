import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getOverview } from "@/lib/domains/secretSanta/services/secretSanta";

/** GET /v1/events/:eventId/secret-santa/overview: devolve o Amigo Secreto do utilizador */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  return json(await getOverview(eventId, user.id));
});
