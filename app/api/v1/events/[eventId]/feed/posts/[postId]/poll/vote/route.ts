import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { votePoll } from "@/lib/domains/feed/services/feedReactions";
import { VoteFeedPollSchema } from "@/lib/zod/feed";

export const POST = apiRoute<{ eventId: string; postId: string }>(async (request, { eventId, postId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const { optionId } = await readJson(request, VoteFeedPollSchema);
  await votePoll(eventId, postId, user.id, optionId);
  return json({ success: true });
});
