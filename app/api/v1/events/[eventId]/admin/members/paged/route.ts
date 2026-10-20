import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readPaging } from "@/lib/api/route";
import { getAdminMembersPaged } from "@/lib/domains/admin/services/members";

/** GET /v1/events/:eventId/admin/members/paged: lista paginada de membros do evento */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  // Lê a paginação do pedido.
  const { skip, take } = readPaging(request);

  return json(await getAdminMembersPaged(eventId, skip, take));
});
