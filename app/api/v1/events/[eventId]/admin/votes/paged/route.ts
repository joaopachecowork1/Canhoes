import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readPaging } from "@/lib/api/route";
import { getAdminVotesPaged } from "@/lib/domains/admin/services/votes";

/** GET /v1/events/:eventId/admin/votes/paged: lista paginada dos votos */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  // Lê a paginação do pedido.
  const { skip, take } = readPaging(request);

  return json(await getAdminVotesPaged(eventId, skip, take));
});
