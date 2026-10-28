import { requireModule, requireUser } from "@/lib/api/guards";
import { HttpError } from "@/lib/api/httpError";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { apiRoute, json, readFormFile } from "@/lib/api/route";
import { isStoryRequestTooLarge, parseContentLength } from "@/lib/domains/stories/rules/storyRules";
import { createStory } from "@/lib/domains/stories/services/stories";
import { listActiveStories } from "@/lib/domains/stories/services/storyViewing";

/** GET /v1/events/:eventId/stories: as stories ativas do evento, agrupadas por membro */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e a área do mural aberta ao membro.
  const user = await requireUser();
  await requireModule(eventId, user, "feed");

  return json(await listActiveStories(eventId));
});

/** POST /v1/events/:eventId/stories: publica uma story (uma imagem que desaparece em 24 horas) */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "strict");
  // Exige sessão iniciada e a área do mural aberta ao membro.
  const user = await requireUser();
  await requireModule(eventId, user, "feed");

  // Recusa cedo, sem ler o corpo: sem tamanho declarado não dá para limitar o que se carrega para memória.
  const requestBytes = parseContentLength(request.headers.get("content-length"));
  if (requestBytes === null) throw new HttpError(411, "LENGTH_REQUIRED", "The size of the request must be declared.");
  if (isStoryRequestTooLarge(requestBytes)) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "The image is too large.");

  const file = await readFormFile(request);

  return json(await createStory(eventId, user.id, file), 201);
});
