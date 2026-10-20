import { enforceRateLimit } from "@/lib/api/rateLimit";
import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readFormFile } from "@/lib/api/route";
import { replaceWishlistImage } from "@/lib/domains/members/services/wishlist";

/** POST /v1/events/:eventId/wishlist/:itemId/image: substitui a imagem de um item da lista de desejos */
export const POST = apiRoute<{ eventId: string; itemId: string }>(async (request, { eventId, itemId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "strict");
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Lê o ficheiro enviado.
  const file = await readFormFile(request);

  const item = await replaceWishlistImage(eventId, itemId, user, file);
  if (!item) throw notFound("Item not found.");
  return json(item);
});
