import { logger } from "@/lib/logger";
import { deleteStoredFile } from "@/lib/storage/localStorage";
import { isStoryKeyForEvent } from "../rules/storyRules";

/** Apaga o ficheiro de uma story com linha e lança se o armazenamento falhar; uma chave estragada só se regista. */
export async function removeStoryFile({
  id,
  eventId,
  storageKey,
}: {
  id: string;
  eventId: string;
  storageKey: string;
}) {
  if (!isStoryKeyForEvent(storageKey, eventId)) {
    logger.warn("Story with a key outside the stories folder: only its row will go", { storyId: id });
    return;
  }
  await deleteStoredFile(storageKey);
}
