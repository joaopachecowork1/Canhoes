import { enforceRateLimit } from "@/lib/api/rateLimit";
import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readFormFile } from "@/lib/api/route";
import { replaceWishlistImage } from "@/lib/domains/members/services/wishlist";

export const POST = apiRoute<{ eventId: string; itemId: string }>(async (request, { eventId, itemId }) => {
  enforceRateLimit(request, "strict");
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const file = await readFormFile(request);
  const item = await replaceWishlistImage(eventId, itemId, user, file);
  if (!item) throw notFound("Item not found.");
  return json(item);
});
