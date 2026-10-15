import { requireModule, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { castVote } from "@/lib/domains/voting/services/voting";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { CreateEventVoteSchema } from "@/lib/zod/voting";

export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  enforceRateLimit(request, "strict");
  const user = await requireUser();
  await requireModule(eventId, user, "voting");
  const { categoryId, selectionId } = await readJson(request, CreateEventVoteSchema);

  return json(await castVote(eventId, user.id, categoryId, selectionId));
});
