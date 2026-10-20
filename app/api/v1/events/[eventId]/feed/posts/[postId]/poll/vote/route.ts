import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { votePoll } from "@/lib/domains/feed/services/feedReactions";
import { VoteFeedPollSchema } from "@/lib/zod/feed";

/** POST /v1/events/:eventId/feed/posts/:postId/poll/vote: vota numa opção da sondagem */
export const POST = apiRoute<{ eventId: string; postId: string }>(async (request, { eventId, postId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Valida o corpo do pedido.
  const { optionId } = await readJson(request, VoteFeedPollSchema);

  await votePoll(eventId, postId, user.id, optionId);
  return json({ success: true });
});
