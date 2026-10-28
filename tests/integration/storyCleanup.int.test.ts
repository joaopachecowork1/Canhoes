import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as runCleanupRoute } from "@/app/api/cron/stories-cleanup/route";
import { cleanupExpiredStories } from "@/lib/domains/stories/services/storyCleanup";
import { prisma } from "@/lib/prisma";

import { createEvent, createMember, randomIp } from "./helpers";
import { IMAGE_BYTES, withTempUploadsDir } from "./storySeed";

const SECRET = "cron-secret-for-tests";

const uploads = withTempUploadsDir("canhoes-story-cleanup-");
const { seedStory } = uploads;
beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/** Chama a rota do cron como a Vercel: um GET com `Authorization: Bearer <segredo>`. */
async function callCleanup(authorization?: string) {
  const response = await runCleanupRoute(
    new NextRequest("http://localhost/api/cron/stories-cleanup", {
      headers: { ...(authorization ? { authorization } : {}), "x-forwarded-for": randomIp() },
    }),
    { params: Promise.resolve({}) },
  );
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

describe("the cleanup route", () => {
  it("does nothing for a caller without the secret", async () => {
    const event = await createEvent();
    const story = await seedStory(event.id, (await createMember(event.id)).id, { expired: true });

    expect((await callCleanup()).status).toBe(401);
    expect((await callCleanup("Bearer wrong-secret")).status).toBe(401);
    expect((await callCleanup(SECRET)).status).toBe(401);

    expect(await prisma.story.count()).toBe(1);
    expect(existsSync(story.filePath)).toBe(true);
  });

  it("refuses everyone, even a caller who sends 'Bearer undefined', when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const event = await createEvent();
    await seedStory(event.id, (await createMember(event.id)).id, { expired: true });

    expect((await callCleanup("Bearer undefined")).status).toBe(401);
    expect((await callCleanup("Bearer ")).status).toBe(401);
    expect((await callCleanup()).status).toBe(401);
    expect(await prisma.story.count()).toBe(1);
  });

  it("removes the expired stories with their files and reports how many", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const old = await seedStory(event.id, author.id, { expired: true });
    const active = await seedStory(event.id, author.id);

    const { status, body } = await callCleanup(`Bearer ${SECRET}`);

    expect(status).toBe(200);
    expect(body).toEqual({ deleted: 1, failed: 0 });
    expect(existsSync(old.filePath)).toBe(false);
    expect(existsSync(active.filePath)).toBe(true);
    expect((await prisma.story.findMany()).map(({ id }) => id)).toEqual([active.id]);
  });

  it("answers 500 when a file could not be removed, so the failure shows up in the cron logs", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const broken = await seedStory(event.id, author.id, { expired: true, withFile: false });
    await mkdir(path.join(uploads.dir, broken.storageKey), { recursive: true });
    const fine = await seedStory(event.id, author.id, { expired: true });

    const { status, body } = await callCleanup(`Bearer ${SECRET}`);

    expect(status).toBe(500);
    expect(body).toEqual({ deleted: 1, failed: 1 });
    expect(existsSync(fine.filePath)).toBe(false);
  });
});

describe("cleaning up expired stories", () => {
  it("never touches the media of the feed", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    await seedStory(event.id, author.id, { expired: true });
    const feedFile = path.join(uploads.dir, "feed", event.id, "photo.webp");
    await mkdir(path.dirname(feedFile), { recursive: true });
    await writeFile(feedFile, IMAGE_BYTES);
    await prisma.hubPostMedia.create({
      data: {
        url: `/uploads/feed/${event.id}/photo.webp`,
        originalFileName: "photo.webp",
        fileSizeBytes: BigInt(IMAGE_BYTES.length),
        uploadedAtUtc: new Date(),
      },
    });

    await cleanupExpiredStories();

    expect(existsSync(feedFile)).toBe(true);
    expect(await prisma.hubPostMedia.count()).toBe(1);
  });

  it("can be repeated: a file that is already gone still lets the row go", async () => {
    const event = await createEvent();
    await seedStory(event.id, (await createMember(event.id)).id, { expired: true, withFile: false });

    expect(await cleanupExpiredStories()).toEqual({ deleted: 1, failed: 0 });
    expect(await cleanupExpiredStories()).toEqual({ deleted: 0, failed: 0 });
  });

  it("keeps going when one file cannot be removed, and keeps that row for the next run", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const broken = await seedStory(event.id, author.id, { expired: true, withFile: false });
    // Um diretório no lugar do ficheiro faz o apagar falhar com um erro real.
    await mkdir(path.join(uploads.dir, broken.storageKey), { recursive: true });
    const fine = await seedStory(event.id, author.id, { expired: true });

    expect(await cleanupExpiredStories()).toEqual({ deleted: 1, failed: 1 });

    expect(existsSync(fine.filePath)).toBe(false);
    expect((await prisma.story.findMany()).map(({ id }) => id)).toEqual([broken.id]);
  });

  it("works through a limited number per run, the ones that expired longest ago first", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    await seedStory(event.id, author.id, { expired: true, ageMs: 3000 });
    await seedStory(event.id, author.id, { expired: true, ageMs: 2000 });
    const freshest = await seedStory(event.id, author.id, { expired: true, ageMs: 1000 });

    expect(await cleanupExpiredStories(new Date(), 2)).toEqual({ deleted: 2, failed: 0 });
    expect((await prisma.story.findMany()).map(({ id }) => id)).toEqual([freshest.id]);
    expect(await cleanupExpiredStories(new Date(), 2)).toEqual({ deleted: 1, failed: 0 });
  });

  it("drops the row of a story whose key points outside the stories folder, instead of retrying it for ever", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const stray = await seedStory(event.id, author.id, { expired: true, withFile: false });
    const feedFile = path.join(uploads.dir, "feed", event.id, "photo.webp");
    await mkdir(path.dirname(feedFile), { recursive: true });
    await writeFile(feedFile, IMAGE_BYTES);
    // Uma chave que nunca se consegue associar a um ficheiro de story (dados estragados).
    await prisma.story.update({ where: { id: stray.id }, data: { storageKey: `feed/${event.id}/photo.webp` } });

    expect(await cleanupExpiredStories()).toEqual({ deleted: 1, failed: 0 });

    expect(await prisma.story.count()).toBe(0);
    expect(existsSync(feedFile)).toBe(true);
  });

  it("works through every batch until nothing expired is left", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    for (const ageMs of [5000, 4000, 3000, 2000, 1000]) await seedStory(event.id, author.id, { expired: true, ageMs });

    expect(await cleanupExpiredStories(new Date(), 100, 2)).toEqual({ deleted: 5, failed: 0 });
    expect(await prisma.story.count()).toBe(0);
  });

  it("does not let stories that keep failing hold up the ones behind them", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const broken = [];
    for (const ageMs of [5000, 4000, 3000]) {
      const story = await seedStory(event.id, author.id, { expired: true, ageMs, withFile: false });
      // Um diretório no lugar do ficheiro faz o apagar falhar com um erro real.
      await mkdir(path.join(uploads.dir, story.storageKey), { recursive: true });
      broken.push(story.id);
    }
    await seedStory(event.id, author.id, { expired: true, ageMs: 2000 });
    await seedStory(event.id, author.id, { expired: true, ageMs: 1000 });

    expect(await cleanupExpiredStories(new Date(), 100, 2)).toEqual({ deleted: 2, failed: 3 });

    expect((await prisma.story.findMany({ orderBy: { id: "asc" } })).map(({ id }) => id).sort()).toEqual(
      [...broken].sort(),
    );
  });

  it("decides what has expired from the instant it is given", async () => {
    const event = await createEvent();
    await seedStory(event.id, (await createMember(event.id)).id);

    expect(await cleanupExpiredStories()).toEqual({ deleted: 0, failed: 0 });
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(await cleanupExpiredStories(inTwoDays)).toEqual({ deleted: 1, failed: 0 });
  });
});
