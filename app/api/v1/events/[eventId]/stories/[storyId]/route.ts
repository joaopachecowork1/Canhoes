import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { apiRoute, noContent } from "@/lib/api/route";
import { deleteStory } from "@/lib/domains/stories/services/stories";

/** DELETE /v1/events/:eventId/stories/:storyId: apaga uma story (o autor ou um admin) */
export const DELETE = apiRoute<{ eventId: string; storyId: string }>(async (request, { eventId, storyId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "standard");
  // Exige sessão iniciada e ser membro do evento; sem exigir o mural aberto, para o autor poder sempre retirar a sua story.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  await deleteStory(eventId, storyId, user);
  return noContent();
});
