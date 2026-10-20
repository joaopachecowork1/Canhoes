import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson, readPaging } from "@/lib/api/route";
import { createWishlistItem, getWishlistItems } from "@/lib/domains/members/services/wishlist";
import { CreateWishlistItemSchema } from "@/lib/zod/wishlist";

export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const { skip, take } = readPaging(request, { maxTake: 1000 });
  return json(await getWishlistItems(eventId, skip, take));
});

export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const item = await readJson(request, CreateWishlistItemSchema);
  return json(await createWishlistItem(eventId, user.id, item), 201);
});
