import { enforceRateLimit } from "@/lib/api/rateLimit";
import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readFormFile } from "@/lib/api/route";
import { replaceNomineeImage } from "@/lib/domains/members/services/nominations";

/** POST /v1/events/:eventId/nominations/:nomineeId/upload: substitui a imagem de um nomeado */
export const POST = apiRoute<{ eventId: string; nomineeId: string }>(async (request, { eventId, nomineeId }) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "strict");
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  // Lê o ficheiro enviado.
  const file = await readFormFile(request);

  const nominee = await replaceNomineeImage(eventId, nomineeId, user, file);
  if (!nominee) throw notFound("Nominee not found.");
  return json(nominee);
});
