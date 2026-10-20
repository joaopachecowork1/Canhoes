import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, noContent } from "@/lib/api/route";
import { deleteWishlistItem } from "@/lib/domains/members/services/wishlist";

export const DELETE = apiRoute<{ eventId: string; itemId: string }>(async (_request, { eventId, itemId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const deleted = await deleteWishlistItem(eventId, itemId, user.id, user.isAdmin);
  if (!deleted) throw notFound("Item not found.");
  return noContent();
});
