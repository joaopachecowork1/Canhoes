import { notFound } from "@/lib/api/httpError";
import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, noContent } from "@/lib/api/route";
import { deleteFeedPost } from "@/lib/domains/feed/services/feedPosts";

export const DELETE = apiRoute<{ eventId: string; postId: string }>(async (_request, { eventId, postId }) => {
  await requireAdmin();
  const deleted = await deleteFeedPost(eventId, postId);
  if (!deleted) throw notFound("Post not found.");
  return noContent();
});
