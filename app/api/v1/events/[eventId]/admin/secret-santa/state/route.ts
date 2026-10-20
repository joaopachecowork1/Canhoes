import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getAdminSecretSantaState } from "@/lib/domains/admin/services/secretSanta";

/** GET /v1/events/:eventId/admin/secret-santa/state: devolve o estado do sorteio para o administrador */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  return json(await getAdminSecretSantaState(eventId));
});
