import { requireModule, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getResults } from "@/lib/domains/voting/services/results";

export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  const user = await requireUser();
  await requireModule(eventId, user, "gala");
  return json(await getResults(eventId));
});
