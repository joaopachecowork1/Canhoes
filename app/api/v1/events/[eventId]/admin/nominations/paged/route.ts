import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readPaging, readStatusFilter } from "@/lib/api/route";
import { getAdminNominationsPaged } from "@/lib/domains/admin/services/nominations";

export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  await requireAdmin();
  const status = readStatusFilter(request);
  const { skip, take } = readPaging(request);
  return json(await getAdminNominationsPaged(eventId, status, skip, take));
});
