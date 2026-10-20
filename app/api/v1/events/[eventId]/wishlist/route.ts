import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson, readPaging } from "@/lib/api/route";
import { createWishlistItem, getWishlistItems } from "@/lib/domains/members/services/wishlist";
import { CreateWishlistItemSchema } from "@/lib/zod/wishlist";

/** GET /v1/events/:eventId/wishlist: lista paginada de itens da lista de desejos */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Lê a paginação do pedido.
  const { skip, take } = readPaging(request, { maxTake: 1000 });

  return json(await getWishlistItems(eventId, skip, take));
});

/** POST /v1/events/:eventId/wishlist: adiciona um item à lista de desejos */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Valida o corpo do pedido.
  const item = await readJson(request, CreateWishlistItemSchema);

  return json(await createWishlistItem(eventId, user.id, item), 201);
});
