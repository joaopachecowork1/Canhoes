import { requireAdmin, requireEventAccess } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { confirmGatheringDate } from "@/lib/domains/gatherings/services/gatheringService";
import { ConfirmGatheringDateSchema } from "@/lib/zod/feed";

/** POST /api/v1/events/:eventId/gatherings/:gatheringId/confirm-date: admin confirma a data do encontro */
export const POST = apiRoute<{ eventId: string; gatheringId: string }>(async (request, { eventId, gatheringId }) => {
  const user = await requireAdmin();
  await requireEventAccess(eventId, user);

  const { dateText } = await readJson(request, ConfirmGatheringDateSchema);
  const gathering = await confirmGatheringDate({ eventId, gatheringId }, dateText, user.id);
  return json(gathering);
});
