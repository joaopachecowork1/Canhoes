import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readFormFile } from "@/lib/api/route";
import { replaceNomineeImage } from "@/lib/domains/members/services/members";

export const POST = apiRoute<{ eventId: string; nomineeId: string }>(async (request, { eventId, nomineeId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const file = await readFormFile(request);
  const nominee = await replaceNomineeImage(eventId, nomineeId, user, file);
  if (!nominee) throw notFound("Nominee not found.");
  return json(nominee);
});
