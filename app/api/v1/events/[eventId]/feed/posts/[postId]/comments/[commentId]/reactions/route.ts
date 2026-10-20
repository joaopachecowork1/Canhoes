import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { toggleCommentReaction } from "@/lib/domains/feed/services/feedComments";
import { ToggleFeedReactionSchema } from "@/lib/zod/feed";

type CommentParams = { eventId: string; postId: string; commentId: string };

/** POST /v1/events/:eventId/feed/posts/:postId/comments/:commentId/reactions: alterna a reação do utilizador a um comentário */
export const POST = apiRoute<CommentParams>(async (request, { eventId, postId, commentId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Valida o corpo do pedido.
  const { emoji } = await readJson(request, ToggleFeedReactionSchema);

  await toggleCommentReaction({ eventId, postId, commentId }, user.id, emoji ?? "heart");
  return json({ success: true });
});
