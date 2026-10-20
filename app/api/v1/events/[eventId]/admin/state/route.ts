import { z } from "zod";

import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { updateAdminState } from "@/lib/domains/admin/services/state";

const stateSchema = z.object({
  nominationsVisible: z.boolean().optional(),
  resultsVisible: z.boolean().optional(),
  moduleVisibility: z.record(z.string(), z.boolean()).optional(),
});

/** PUT /v1/events/:eventId/admin/state: atualiza a visibilidade de nomeações, resultados e áreas */
export const PUT = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Só administradores.
  await requireAdmin();

  // Valida o corpo do pedido.
  const changes = await readJson(request, stateSchema);

  return json(await updateAdminState(eventId, changes));
});
