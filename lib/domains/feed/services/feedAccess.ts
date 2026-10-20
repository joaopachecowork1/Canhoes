import { notFound } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";

/** Toda a ação sobre um post é limitada ao evento do URL: um post de outro evento dá 404. */
export async function assertPostInEvent(eventId: string, postId: string) {
  const post = await prisma.hubPost.findFirst({ where: { id: postId, eventId }, select: { id: true } });
  if (!post) throw notFound("Post not found.");
}
