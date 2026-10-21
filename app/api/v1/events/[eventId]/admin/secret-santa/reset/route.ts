import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { resetSecretSantaDraw } from "@/lib/domains/admin/services/secretSanta";

/** POST /v1/events/:eventId/admin/secret-santa/reset: desfaz e reinicia o sorteio do Amigo Secreto */
export const POST = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  return json(await resetSecretSantaDraw(eventId));
});
