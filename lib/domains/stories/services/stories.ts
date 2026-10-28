import { HttpError, notFound } from "@/lib/api/httpError";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveUpload } from "@/lib/storage/localStorage";
import { computeStoryExpiry, hasReachedStoryLimit, MAX_STORY_BYTES, STORY_IMAGE_TYPES } from "../rules/storyRules";
import { cleanupExpiredStories } from "./storyCleanup";
import { removeStoryFile } from "./storyMedia";

// Quantas stories expiradas do autor se limpam de cada vez ao publicar (ele tem no máximo 10 ativas).
const EXPIRED_CLEANUP_LIMIT = 20;
// Os ids de eventos só têm letras, números, hífen e underscore, como as pastas de uploads.
const SAFE_FOLDER_NAME = /^[a-zA-Z0-9_-]+$/;

// O membro já tem o máximo de stories ativas; nos route handlers vira um 409.
class StoryLimitReachedError extends HttpError {
  constructor() {
    super(409, "STORY_LIMIT_REACHED", "You already have the maximum number of active stories.");
  }
}

/** Conta as stories ativas de um membro neste evento. */
function countActiveStories(db: Pick<typeof prisma, "story">, eventId: string, authorUserId: string, now: Date) {
  return db.story.count({ where: { eventId, authorUserId, expiresAtUtc: { gt: now } } });
}

/** Publica uma story: limpa as expiradas do autor, vê a quota, guarda a imagem e regista a linha sob lock (sem linha, apaga a imagem). */
export async function createStory(eventId: string, authorUserId: string, file: File, now = new Date()) {
  // O id de um evento é sempre assim; outro valor daria uma pasta diferente da que se apaga depois (e um admin pode pedir qualquer id).
  if (!SAFE_FOLDER_NAME.test(eventId)) throw notFound("Event not found.");

  // Sem cron (Docker ou local), é aqui que as stories expiradas do próprio autor saem; uma falha não impede de publicar.
  await cleanupExpiredStories(now, EXPIRED_CLEANUP_LIMIT, EXPIRED_CLEANUP_LIMIT, { eventId, authorUserId }).catch(
    (error) => logger.error("Could not clean up the expired stories of the author", error, { eventId }),
  );

  // Contagem barata antes de gravar nada: quem já está no limite não gasta uma escrita e um apagar no R2 por pedido.
  if (hasReachedStoryLimit(await countActiveStories(prisma, eventId, authorUserId, now))) {
    throw new StoryLimitReachedError();
  }

  const upload = await saveUpload(file, ["stories", eventId], {
    allowedTypes: STORY_IMAGE_TYPES,
    maxBytes: MAX_STORY_BYTES,
  });
  const storageKey = upload.url.slice("/uploads/".length);

  const memberLockKey = `${authorUserId}:${eventId}`;

  try {
    return await prisma.$transaction(async (tx) => {
      // O lock serializa os pedidos do mesmo membro neste evento: sem ele, dois pedidos em paralelo leem 9 e ambos inserem.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${memberLockKey}::text, 0))`;
      if (hasReachedStoryLimit(await countActiveStories(tx, eventId, authorUserId, now))) {
        throw new StoryLimitReachedError();
      }

      return tx.story.create({
        data: {
          eventId,
          authorUserId,
          storageKey,
          contentType: upload.contentType,
          createdAtUtc: now,
          expiresAtUtc: computeStoryExpiry(now),
        },
        select: { id: true, createdAtUtc: true, expiresAtUtc: true },
      });
    });
  } catch (error) {
    // O commit pode ter chegado à base de dados mesmo que a resposta se tenha perdido: com a linha lá, a imagem fica.
    // Só se apaga quando se sabe que não há linha; sem conseguir saber, a lifecycle do R2 trata de um ficheiro órfão.
    const outcome = await prisma.story.findUnique({ where: { storageKey }, select: { id: true } }).then(
      (row) => (row ? "saved" : "missing"),
      () => "unknown",
    );
    if (outcome === "missing") {
      await deleteStoredFile(storageKey).catch((cleanupError) =>
        logger.error("Could not remove the file of a story that was not saved", cleanupError, { storageKey }),
      );
    }
    throw error;
  }
}

/** Apaga uma story do evento, só para o autor ou um admin; o ficheiro sai primeiro, para uma falha se poder repetir. */
export async function deleteStory(eventId: string, storyId: string, user: { id: string; isAdmin: boolean }) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, eventId },
    select: { id: true, authorUserId: true, storageKey: true },
  });
  if (!story) throw notFound("Story not found.");
  if (story.authorUserId !== user.id && !user.isAdmin) {
    throw new HttpError(403, "FORBIDDEN", "Only the author or an admin can delete a story.");
  }

  await removeStoryFile({ id: story.id, eventId, storageKey: story.storageKey });
  await prisma.story.deleteMany({ where: { id: story.id } });
}
