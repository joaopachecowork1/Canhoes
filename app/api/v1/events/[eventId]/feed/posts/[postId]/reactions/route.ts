import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { toggleReaction } from "@/lib/domains/feed/services/feedReactions";
import { ToggleFeedReactionSchema } from "@/lib/zod/feed";

/** POST /v1/events/:eventId/feed/posts/:postId/reactions: alterna a reação do utilizador a uma publicação */
export const POST = apiRoute<{ eventId: string; postId: string }>(async (request, { eventId, postId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Valida o corpo do pedido.
  const { emoji } = await readJson(request, ToggleFeedReactionSchema);

  await toggleReaction(eventId, postId, user.id, emoji ?? "heart");
  return json({ success: true });
});
