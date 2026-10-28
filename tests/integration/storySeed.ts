import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll } from "vitest";

import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Os bytes de uma imagem WebP mínima, para o ficheiro de uma story de teste. */
export const IMAGE_BYTES = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3]);

/** Cria uma story na base de dados e, por omissão, o ficheiro dela dentro de `uploadsDir`; `expired` põe-na no passado, há `ageMs` milissegundos. */
export async function seedStory(
  uploadsDir: string,
  eventId: string,
  authorUserId: string,
  { ageMs = 1000, expired = false, withFile = true } = {},
) {
  const now = Date.now();
  const storageKey = `stories/${eventId}/${randomUUID().replaceAll("-", "")}.webp`;
  if (withFile) {
    await mkdir(path.join(uploadsDir, path.dirname(storageKey)), { recursive: true });
    await writeFile(path.join(uploadsDir, storageKey), IMAGE_BYTES);
  }
  const story = await prisma.story.create({
    data: {
      eventId,
      authorUserId,
      storageKey,
      contentType: "image/webp",
      createdAtUtc: new Date(now - ageMs),
      expiresAtUtc: new Date(expired ? now - ageMs : now + DAY_MS - ageMs),
    },
  });
  return { ...story, filePath: path.join(uploadsDir, storageKey) };
}

/** Dá a este ficheiro de testes uma pasta de uploads temporária (`dir`) e o `seedStory` já ligado a ela. */
export function withTempUploadsDir(prefix: string) {
  let dir = "";
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), prefix));
    process.env.UPLOADS_DIR = dir;
  });
  afterAll(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  return {
    get dir() {
      return dir;
    },
    seedStory: (eventId: string, authorUserId: string, options?: Parameters<typeof seedStory>[3]) =>
      seedStory(dir, eventId, authorUserId, options),
  };
}
