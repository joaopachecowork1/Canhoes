import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, noContent } from "@/lib/api/route";
import { deleteComment } from "@/lib/domains/feed/services/feedComments";

type CommentParams = { eventId: string; postId: string; commentId: string };

/** DELETE /v1/events/:eventId/feed/posts/:postId/comments/:commentId: apaga um comentário (do autor ou de um administrador) */
export const DELETE = apiRoute<CommentParams>(async (_request, { eventId, postId, commentId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const deleted = await deleteComment({ eventId, postId, commentId }, user);
  if (!deleted) throw notFound("Comment not found or not authorized.");
  return noContent();
});
