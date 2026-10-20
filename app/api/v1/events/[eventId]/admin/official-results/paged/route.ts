import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readPaging } from "@/lib/api/route";
import { getAdminOfficialResultsPaged } from "@/lib/domains/admin/services/votes";

/** GET /v1/events/:eventId/admin/official-results/paged: lista paginada dos resultados oficiais */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  // Lê a paginação do pedido.
  const { skip, take } = readPaging(request);

  return json(await getAdminOfficialResultsPaged(eventId, skip, take));
});
