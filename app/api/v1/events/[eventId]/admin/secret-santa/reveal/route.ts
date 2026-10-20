import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { revealSecretSantaDraw } from "@/lib/domains/admin/services/secretSanta";

/** POST /v1/events/:eventId/admin/secret-santa/reveal: revela o sorteio do Amigo Secreto */
export const POST = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  return json(await revealSecretSantaDraw(eventId));
});
