import { z } from "zod";

import { notFound } from "@/lib/api/httpError";
import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { setNominationCategory } from "@/lib/domains/admin/services/nominations";

const setCategorySchema = z.object({ categoryId: z.string().nullish() });

/** POST /v1/events/:eventId/admin/nominations/:nomineeId/set-category: muda a categoria de uma nomeação */
export const POST = apiRoute<{ eventId: string; nomineeId: string }>(async (request, { eventId, nomineeId }) => {
  // Só administradores.
  await requireAdmin();

  // Valida o corpo do pedido.
  const { categoryId } = await readJson(request, setCategorySchema);

  const nominee = await setNominationCategory(eventId, nomineeId, categoryId ?? null);
  if (!nominee) throw notFound("Nominee not found.");
  return json(nominee);
});
