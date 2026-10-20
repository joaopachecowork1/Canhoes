import { enforceRateLimit } from "@/lib/api/rateLimit";
import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readFormFile } from "@/lib/api/route";
import { replaceNomineeImage } from "@/lib/domains/members/services/nominations";

export const POST = apiRoute<{ eventId: string; nomineeId: string }>(async (request, { eventId, nomineeId }) => {
  enforceRateLimit(request, "strict");
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const file = await readFormFile(request);
  const nominee = await replaceNomineeImage(eventId, nomineeId, user, file);
  if (!nominee) throw notFound("Nominee not found.");
  return json(nominee);
});
