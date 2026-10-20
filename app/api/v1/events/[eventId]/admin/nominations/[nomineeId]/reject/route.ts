import { notFound } from "@/lib/api/httpError";
import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { rejectNomination } from "@/lib/domains/admin/services/nominations";

/** POST /v1/events/:eventId/admin/nominations/:nomineeId/reject: rejeita uma nomeação */
export const POST = apiRoute<{ eventId: string; nomineeId: string }>(async (_request, { eventId, nomineeId }) => {
  // Só administradores.
  await requireAdmin();

  const nominee = await rejectNomination(eventId, nomineeId);
  if (!nominee) throw notFound("Nominee not found.");
  return json(nominee);
});
