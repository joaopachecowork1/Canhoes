import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { apiRoute, json, readJson } from "@/lib/api/route";
import { createComment, getPostComments } from "@/lib/domains/feed/services/feedComments";
import { CreateFeedCommentSchema } from "@/lib/zod/feed";

type PostParams = { eventId: string; postId: string };

export const GET = apiRoute<PostParams>(async (_request, { eventId, postId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  return json(await getPostComments(eventId, postId, user.id));
});

export const POST = apiRoute<PostParams>(async (request, { eventId, postId }) => {
  enforceRateLimit(request, "standard");
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const { text, replyToId } = await readJson(request, CreateFeedCommentSchema);
  return json(await createComment(eventId, postId, user.id, { text, replyToId }), 201);
});
