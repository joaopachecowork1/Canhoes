import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { removeStoryFile } from "./storyMedia";

// Máximo de stories que uma corrida tenta apagar, e o tempo que se dá a si própria (abaixo do `maxDuration` de 60 s da rota).
const MAX_STORIES_PER_RUN = 1000;
const TIME_BUDGET_MS = 45_000;
// Quantas stories se leem de cada vez, e quantos ficheiros se apagam ao mesmo tempo no R2.
const BATCH_SIZE = 50;
const PARALLEL_DELETES = 10;

type ExpiredStory = { id: string; eventId: string; storageKey: string };

/** Tenta apagar os ficheiros de um lote, em grupos pequenos; devolve os ids que se podem apagar da base de dados e os que falharam. */
async function removeFiles(batch: ExpiredStory[]) {
  const removableIds: string[] = [];
  const failedIds: string[] = [];
  for (let start = 0; start < batch.length; start += PARALLEL_DELETES) {
    const group = batch.slice(start, start + PARALLEL_DELETES);
    const results = await Promise.allSettled(group.map(removeStoryFile));
    results.forEach((result, index) => {
      const story = group[index]!;
      if (result.status === "fulfilled") {
        removableIds.push(story.id);
        return;
      }
      failedIds.push(story.id);
      logger.error("Could not remove the file of an expired story", result.reason, { storyId: story.id });
    });
  }
  return { removableIds, failedIds };
}

/** De quem são as stories a limpar; sem isto limpam-se as de todos. */
type StoryOwner = { eventId: string; authorUserId: string };

/** Apaga as stories expiradas (só as de `owner`, se vier) por lotes, ficheiro primeiro; devolve quantas saíram e quantas falharam. */
export async function cleanupExpiredStories(
  now = new Date(),
  limit = MAX_STORIES_PER_RUN,
  batchSize = BATCH_SIZE,
  owner?: StoryOwner,
) {
  // O prazo conta tempo real da corrida, não o instante `now` que decide o que expirou.
  const deadline = Date.now() + TIME_BUDGET_MS;
  const failedIds: string[] = [];
  let deleted = 0;

  while (deleted + failedIds.length < limit && Date.now() < deadline) {
    const batch = await prisma.story.findMany({
      where: { ...owner, expiresAtUtc: { lte: now }, id: { notIn: failedIds } },
      orderBy: { expiresAtUtc: "asc" },
      take: Math.min(batchSize, limit - deleted - failedIds.length),
      select: { id: true, eventId: true, storageKey: true },
    });
    if (batch.length === 0) break;

    const result = await removeFiles(batch);
    await prisma.story.deleteMany({ where: { id: { in: result.removableIds } } });
    deleted += result.removableIds.length;
    failedIds.push(...result.failedIds);
  }

  return { deleted, failed: failedIds.length };
}
