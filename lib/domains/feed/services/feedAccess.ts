import { notFound } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";

/** Every post-level action is scoped to the event in the URL: a post from another event is a 404. */
export async function assertPostInEvent(eventId: string, postId: string) {
  const post = await prisma.hubPost.findFirst({ where: { id: postId, eventId }, select: { id: true } });
  if (!post) throw notFound("Post not found.");
}
