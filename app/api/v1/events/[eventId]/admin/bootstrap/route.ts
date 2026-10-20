import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getAdminBootstrap } from "@/lib/domains/admin/services/state";

/** GET /v1/events/:eventId/admin/bootstrap: devolve os dados iniciais do painel de administração */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  return json(await getAdminBootstrap(eventId));
});
