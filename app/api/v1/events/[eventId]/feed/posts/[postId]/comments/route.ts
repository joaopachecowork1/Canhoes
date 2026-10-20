import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createComment, getPostComments } from "@/lib/domains/feed/services/feedComments";
import { CreateFeedCommentSchema } from "@/lib/zod/feed";

type PostParams = { eventId: string; postId: string };

/** GET /v1/events/:eventId/feed/posts/:postId/comments: lista os comentários de uma publicação */
export const GET = apiRoute<PostParams>(async (_request, { eventId, postId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  return json(await getPostComments(eventId, postId, user.id));
});

/** POST /v1/events/:eventId/feed/posts/:postId/comments: comenta uma publicação ou responde a um comentário */
export const POST = apiRoute<PostParams>(async (request, { eventId, postId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "standard");
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Valida o corpo do pedido.
  const { text, replyToId } = await readJson(request, CreateFeedCommentSchema);

  return json(await createComment(eventId, postId, user.id, { text, replyToId }), 201);
});
