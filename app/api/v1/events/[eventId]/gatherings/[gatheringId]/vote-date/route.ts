import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { toggleGatheringDateVote } from "@/lib/domains/gatherings/services/gatheringService";
import { VoteGatheringDateSchema } from "@/lib/zod/feed";

/** POST /api/v1/events/:eventId/gatherings/:gatheringId/vote-date: vota numa data candidata do encontro */
export const POST = apiRoute<{ eventId: string; gatheringId: string }>(async (request, { eventId, gatheringId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const { optionId } = await readJson(request, VoteGatheringDateSchema);
  const gathering = await toggleGatheringDateVote({ eventId, gatheringId }, optionId, user.id);
  return json(gathering);
});
