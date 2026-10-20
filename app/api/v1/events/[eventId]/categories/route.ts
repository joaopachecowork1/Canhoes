import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readPaging } from "@/lib/api/route";
import { getActiveCategories } from "@/lib/domains/admin/services/categories";

/** GET /v1/events/:eventId/categories: lista as categorias ativas */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Lê a paginação do pedido.
  const { skip, take } = readPaging(request, { maxTake: 1000 });

  return json(await getActiveCategories(eventId, skip, take));
});
