import type { Prisma } from "@/lib/generated/prisma/client";
import { notFound } from "@/lib/api/httpError";
import type { StoryAuthorDto } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";
import { isMissingFileError, readUpload } from "@/lib/storage/localStorage";
import { groupStoriesByAuthor } from "../rules/storyRules";

// O que um membro pode ver: stories por expirar, de quem ainda está no evento (ou é admin, que não precisa de ser membro).
function visibleStoriesWhere(eventId: string, now: Date): Prisma.StoryWhereInput {
  return {
    eventId,
    expiresAtUtc: { gt: now },
    author: { OR: [{ isAdmin: true }, { eventMemberships: { some: { eventId } } }] },
  };
}

/** Lista as stories ativas do evento, agrupadas por membro e sem a chave dos ficheiros. */
export async function listActiveStories(eventId: string, now = new Date()): Promise<StoryAuthorDto[]> {
  const stories = await prisma.story.findMany({
    where: visibleStoriesWhere(eventId, now),
    select: {
      id: true,
      createdAtUtc: true,
      expiresAtUtc: true,
      author: { select: { id: true, displayName: true, email: true, color: true } },
    },
    orderBy: { createdAtUtc: "asc" },
  });
  return groupStoriesByAuthor(eventId, stories);
}

/** Lê a imagem de uma story visível; devolve 404 se não existe neste evento, já expirou ou o ficheiro já não está. */
export async function readStoryMedia(eventId: string, storyId: string, now = new Date()) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, ...visibleStoriesWhere(eventId, now) },
    select: { storageKey: true },
  });
  if (!story) throw notFound("Story not found.");

  try {
    return await readUpload(story.storageKey.split("/"));
  } catch (error) {
    if (isMissingFileError(error)) throw notFound("Story not found.");
    throw error;
  }
}
