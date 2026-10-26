import { requireAdmin } from "@/lib/api/guards";
import { apiRoute } from "@/lib/api/route";
import { removeEventMember } from "@/lib/domains/admin/services/members";

/** DELETE /v1/events/:eventId/admin/members/:userId: tira o membro do evento, sem apagar a conta */
export const DELETE = apiRoute<{ eventId: string; userId: string }>(async (_request, { eventId, userId }) => {
  // Só administradores.
  const admin = await requireAdmin();

  await removeEventMember({ actorUserId: admin.id, eventId, targetUserId: userId });
  return new Response(null, { status: 204 });
});
