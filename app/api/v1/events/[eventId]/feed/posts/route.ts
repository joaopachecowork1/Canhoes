import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { apiRoute, json, readJson, readPaging } from "@/lib/api/route";
import { createFeedPost, getFeedPosts } from "@/lib/domains/feed/services/feedPosts";
import { CreateFeedPostSchema } from "@/lib/zod/feed";

/** GET /v1/events/:eventId/feed/posts: lista paginada de publicações do feed */
export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Lê a paginação do pedido.
  const { skip, take } = readPaging(request, { defaultTake: 15, maxTake: 50 });

  return json(await getFeedPosts(eventId, user.id, skip, take));
});

/** POST /v1/events/:eventId/feed/posts: cria uma publicação */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "standard");
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Valida o corpo do pedido.
  const post = await readJson(request, CreateFeedPostSchema);

  return json(await createFeedPost(eventId, user.id, post), 201);
});
