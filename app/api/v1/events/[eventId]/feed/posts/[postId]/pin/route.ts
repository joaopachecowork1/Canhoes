import { z } from "zod";

import { notFound } from "@/lib/api/httpError";
import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { movePinnedPost, togglePin } from "@/lib/domains/feed/services/feedPosts";

const moveSchema = z.object({ direction: z.enum(["up", "down"]) }).strict();

type PostParams = { eventId: string; postId: string };

export const POST = apiRoute<PostParams>(async (_request, { eventId, postId }) => {
  await requireAdmin();
  const post = await togglePin(eventId, postId);
  if (!post) throw notFound("Post not found.");
  return json(post);
});

export const PATCH = apiRoute<PostParams>(async (request, { eventId, postId }) => {
  await requireAdmin();
  const { direction } = await readJson(request, moveSchema);
  const moved = await movePinnedPost(eventId, postId, direction);
  if (!moved) throw notFound("Pinned post not found.");
  return json({ success: true });
});
