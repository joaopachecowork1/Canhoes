import { z } from "zod";

import { notFound } from "@/lib/api/httpError";
import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { movePinnedPost, togglePin } from "@/lib/domains/feed/services/feedPins";

const moveSchema = z.object({ direction: z.enum(["up", "down"]) }).strict();

type PostParams = { eventId: string; postId: string };

/** POST /v1/events/:eventId/feed/posts/:postId/pin: fixa ou desafixa uma publicação */
export const POST = apiRoute<PostParams>(async (_request, { eventId, postId }) => {
  // Só administradores.
  await requireAdmin();

  const post = await togglePin(eventId, postId);
  if (!post) throw notFound("Post not found.");
  return json(post);
});

/** PATCH /v1/events/:eventId/feed/posts/:postId/pin: move uma publicação fixada para cima ou para baixo */
export const PATCH = apiRoute<PostParams>(async (request, { eventId, postId }) => {
  // Só administradores.
  await requireAdmin();

  // Valida o corpo do pedido.
  const { direction } = await readJson(request, moveSchema);

  const moved = await movePinnedPost(eventId, postId, direction);
  if (!moved) throw notFound("Pinned post not found.");
  return json({ success: true });
});
