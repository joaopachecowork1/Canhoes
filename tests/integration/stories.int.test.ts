import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { createEvent, createUser } from "./helpers";

const NOW = new Date("2026-10-27T10:00:00.000Z");

/** Cria uma story de teste com valores por omissão válidos. */
function createStory(eventId: string, authorUserId: string, storageKey = "stories/event/0a1b2c.webp") {
  return prisma.story.create({
    data: {
      eventId,
      authorUserId,
      storageKey,
      contentType: "image/webp",
      createdAtUtc: NOW,
      expiresAtUtc: new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
    },
  });
}

/** O modelo de dados das stories: guarda a chave do ficheiro e acompanha o ciclo de vida do autor e do evento. */
describe("story data model", () => {
  it("stores a story with its storage key and expiry", async () => {
    const event = await createEvent();
    const author = await createUser();

    const story = await createStory(event.id, author.id, `stories/${event.id}/0a1b2c.webp`);

    const stored = await prisma.story.findUniqueOrThrow({ where: { id: story.id } });
    expect(stored.storageKey).toBe(`stories/${event.id}/0a1b2c.webp`);
    expect(stored.expiresAtUtc.toISOString()).toBe("2026-10-28T10:00:00.000Z");
  });

  it("refuses two stories that point at the same file", async () => {
    const event = await createEvent();
    const author = await createUser();
    await createStory(event.id, author.id);

    await expect(createStory(event.id, author.id)).rejects.toThrow();
  });

  it("refuses a story whose author does not exist", async () => {
    const event = await createEvent();

    await expect(createStory(event.id, "00000000-0000-0000-0000-000000000000")).rejects.toThrow();
  });

  it("deletes the stories of a deleted author", async () => {
    const event = await createEvent();
    const author = await createUser();
    await createStory(event.id, author.id);

    await prisma.user.delete({ where: { id: author.id } });

    expect(await prisma.story.count()).toBe(0);
  });

  it("deletes the stories of a deleted event", async () => {
    const event = await createEvent();
    const author = await createUser();
    await createStory(event.id, author.id);

    await prisma.event.delete({ where: { id: event.id } });

    expect(await prisma.story.count()).toBe(0);
  });
});
