import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readPaging, readStatusFilter } from "@/lib/api/route";
import { getMeasureProposals } from "@/lib/domains/admin/services/proposals";

/** GET /v1/events/:eventId/admin/measure-proposals: lista paginada de propostas de medida, filtrável por estado */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  // Lê o filtro de estado e a paginação.
  const status = readStatusFilter(request);
  const { skip, take } = readPaging(request);

  return json(await getMeasureProposals(eventId, status, skip, take));
});
