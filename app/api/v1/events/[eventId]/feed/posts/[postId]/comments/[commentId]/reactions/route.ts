import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { toggleCommentReaction } from "@/lib/domains/feed/services/feedComments";
import { ToggleFeedReactionSchema } from "@/lib/zod/feed";

type CommentParams = { eventId: string; postId: string; commentId: string };

export const POST = apiRoute<CommentParams>(async (request, { eventId, postId, commentId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const { emoji } = await readJson(request, ToggleFeedReactionSchema);
  await toggleCommentReaction({ eventId, postId, commentId }, user.id, emoji ?? "heart");
  return json({ success: true });
});
