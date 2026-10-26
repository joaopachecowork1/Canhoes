import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { toggleLike } from "@/lib/domains/feed/services/feedReactions";
import { enforceRateLimit } from "@/lib/api/rateLimit";

/** POST /v1/events/:eventId/feed/posts/:postId/like: alterna o gosto numa publicação */
export const POST = apiRoute<{ eventId: string; postId: string }>(async (request, { eventId, postId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "standard");
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  return json({ liked: await toggleLike(eventId, postId, user.id) });
});
