import { enforceRateLimit } from "@/lib/api/rateLimit";
import { badRequest } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { MAX_IMAGES_PER_POST, saveFeedImages } from "@/lib/domains/feed/services/feedPosts";

export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  enforceRateLimit(request, "strict");
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const files = (await request.formData()).getAll("files").filter((value): value is File => value instanceof File);
  if (files.length === 0) throw badRequest("No files provided.");
  if (files.length > MAX_IMAGES_PER_POST) throw badRequest(`A maximum of ${MAX_IMAGES_PER_POST} images is allowed.`);

  return json({ files: await saveFeedImages(eventId, user.id, files) });
});
