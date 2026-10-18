import { requireEventAccess, requireUser } from "@/lib/api/guards";
import { apiRoute, json, readJson, readPaging } from "@/lib/api/route";
import { createFeedPost, getFeedPosts } from "@/lib/domains/feed/services/feedPosts";
import { CreateFeedPostSchema } from "@/lib/zod/feed";

export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const { skip, take } = readPaging(request, { defaultTake: 15, maxTake: 50 });
  return json(await getFeedPosts(eventId, user.id, skip, take));
});

export const POST = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
  const user = await requireUser();
  await requireEventAccess(eventId, user);
  const post = await readJson(request, CreateFeedPostSchema);
  return json(await createFeedPost(eventId, user.id, post), 201);
});
