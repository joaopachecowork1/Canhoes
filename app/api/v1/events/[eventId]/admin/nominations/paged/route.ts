import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readPaging, readStatusFilter } from "@/lib/api/route";
import { getAdminNominationsPaged } from "@/lib/domains/admin/services/nominations";

/** GET /v1/events/:eventId/admin/nominations/paged: lista paginada de nomeações, filtrável por estado */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  // Lê o filtro de estado e a paginação.
  const status = readStatusFilter(request);
  const { skip, take } = readPaging(request);

  return json(await getAdminNominationsPaged(eventId, status, skip, take));
});
