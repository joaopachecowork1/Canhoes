import { z } from "zod";

import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { executeSecretSantaDraw } from "@/lib/domains/admin/services/secretSanta";

const drawSchema = z.object({
  eventCode: z.string().optional(),
  force: z.boolean().optional(),
});

/** POST /v1/events/:eventId/admin/secret-santa/draw: faz o sorteio do Amigo Secreto */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  const admin = await requireAdmin();

  // Valida o corpo do pedido (se existir).
  const body = await readJson(request, drawSchema).catch(() => ({}));

  return json(await executeSecretSantaDraw(eventId, admin.id, body));
});
