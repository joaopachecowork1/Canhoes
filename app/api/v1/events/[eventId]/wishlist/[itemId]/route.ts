import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, noContent } from "@/lib/api/route";
import { deleteWishlistItem } from "@/lib/domains/members/services/wishlist";

/** DELETE /v1/events/:eventId/wishlist/:itemId: apaga um item da lista de desejos */
export const DELETE = apiRoute<{ eventId: string; itemId: string }>(async (_request, { eventId, itemId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const deleted = await deleteWishlistItem(eventId, itemId, user.id, user.isAdmin);
  if (!deleted) throw notFound("Item not found.");
  return noContent();
});
