import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getMyNominations } from "@/lib/domains/members/services/nominations";

/** GET /v1/events/:eventId/nominations/my-status: lista as nomeações do utilizador e o seu estado */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  return json(await getMyNominations(eventId, user.id));
});
