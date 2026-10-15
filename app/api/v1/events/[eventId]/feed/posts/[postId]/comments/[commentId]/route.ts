import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, noContent } from "@/lib/api/route";
import { deleteComment } from "@/lib/domains/feed/services/feed";

type CommentParams = { eventId: string; postId: string; commentId: string };

export const DELETE = apiRoute<CommentParams>(async (_request, { eventId, postId, commentId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const deleted = await deleteComment(eventId, postId, commentId, user.id, user.isAdmin);
  if (!deleted) throw notFound("Comment not found or not authorized.");
  return noContent();
});
