import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { toggleDownvote } from "@/lib/domains/feed/services/feedReactions";

/** POST /v1/events/:eventId/feed/posts/:postId/downvote: alterna o voto negativo numa publicação */
export const POST = apiRoute<{ eventId: string; postId: string }>(async (_request, { eventId, postId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  return json({ downvoted: await toggleDownvote(eventId, postId, user.id) });
});
