import { notFound } from "@/lib/api/httpError";
import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { getVotingBoard } from "@/lib/domains/voting/services/voting";

/** GET /v1/events/:eventId/voting: devolve o boletim de votação */
export const GET = apiRoute<{ eventId: string }>(async (_request, { eventId }) => {
  // Exige sessão iniciada e ser membro do evento.
  const user = await requireUser();
  await requireEventAccess(eventId, user);

  const board = await getVotingBoard(eventId, user.id);
  if (!board) throw notFound("Event not found.");
  return json(board);
});
