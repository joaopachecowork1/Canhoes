import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { toggleDownvote } from "@/lib/domains/feed/services/feedReactions";

export const POST = apiRoute<{ eventId: string; postId: string }>(async (_request, { eventId, postId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  await toggleDownvote(eventId, postId, user.id);
  return json({ success: true });
});
