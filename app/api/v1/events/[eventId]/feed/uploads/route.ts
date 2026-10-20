import { enforceRateLimit } from "@/lib/api/rateLimit";
import { badRequest } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { MAX_IMAGES_PER_POST, saveFeedImages } from "@/lib/domains/feed/services/feedPosts";

/** POST /v1/events/:eventId/feed/uploads: carrega as imagens de uma publicação */
export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "strict");
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Lê os ficheiros enviados e confirma que há e que não passam do limite.
  const files = (await request.formData()).getAll("files").filter((value): value is File => value instanceof File);
  if (files.length === 0) throw badRequest("No files provided.");
  if (files.length > MAX_IMAGES_PER_POST) throw badRequest(`A maximum of ${MAX_IMAGES_PER_POST} images is allowed.`);

  // Grava as imagens e devolve os URLs.
  return json({ files: await saveFeedImages(eventId, user.id, files) });
});
