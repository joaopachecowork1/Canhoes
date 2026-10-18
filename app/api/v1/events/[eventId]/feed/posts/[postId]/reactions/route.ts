import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { toggleReaction } from "@/lib/domains/feed/services/feedReactions";
import { ToggleFeedReactionSchema } from "@/lib/zod/feed";

export const POST = apiRoute<{ eventId: string; postId: string }>(async (request, { eventId, postId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const { emoji } = await readJson(request, ToggleFeedReactionSchema);
  await toggleReaction(eventId, postId, user.id, emoji ?? "heart");
  return json({ success: true });
});
