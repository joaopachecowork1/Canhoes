import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { toggleLike } from "@/lib/domains/feed/services/feedReactions";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const POST = apiRoute<{ eventId: string; postId: string }>(async (request, { eventId, postId }) => {
  enforceRateLimit(request, "standard");
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  await toggleLike(eventId, postId, user.id);
  return json({ success: true });
});
