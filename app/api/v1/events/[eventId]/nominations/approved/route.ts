import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getApprovedNominees } from "@/lib/domains/members/services/nominations";

/** GET /v1/events/:eventId/nominations/approved: lista os nomeados aprovados */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  return json(await getApprovedNominees(eventId));
});
