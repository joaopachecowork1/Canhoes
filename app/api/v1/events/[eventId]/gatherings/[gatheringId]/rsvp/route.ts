import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { submitGatheringRsvp } from "@/lib/domains/gatherings/services/gatheringService";
import { SubmitGatheringRsvpSchema } from "@/lib/zod/feed";

/** POST /api/v1/events/:eventId/gatherings/:gatheringId/rsvp: membro submete resposta de presença */
export const POST = apiRoute<{ eventId: string; gatheringId: string }>(async (request, { eventId, gatheringId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const { status, note } = await readJson(request, SubmitGatheringRsvpSchema);
  const gathering = await submitGatheringRsvp({ eventId, gatheringId }, user.id, status, note);
  return json(gathering);
});
