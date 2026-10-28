import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as postStory } from "@/app/api/v1/events/[eventId]/stories/route";
import { createStory } from "@/lib/domains/stories/services/stories";
import { prisma } from "@/lib/prisma";

import { createEvent, createMember, randomIp, signInAs } from "./helpers";
import { withTempUploadsDir } from "./storySeed";

const MB = 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

const uploads = withTempUploadsDir("canhoes-story-uploads-");
afterEach(() => {
  vi.restoreAllMocks();
});

/** Uma imagem WebP válida (só os bytes de abertura) com o tamanho pedido. */
function webp(size = 64, type = "image/webp") {
  const bytes = new Uint8Array(size);
  bytes.set(WEBP_HEAD);
  return new File([bytes], "story.webp", { type });
}

/** Faz um POST às stories com o corpo e os cabeçalhos dados, e devolve o estado e o JSON da resposta. */
async function sendToStories(eventId: string, body: ArrayBuffer, headers: Record<string, string>) {
  const response = await postStory(
    new NextRequest("http://localhost/api/test", {
      method: "POST",
      body,
      headers: { ...headers, "x-forwarded-for": randomIp() },
    }),
    { params: Promise.resolve({ eventId }) },
  );
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

/** Envia o ficheiro como o browser: multipart, com o `content-length` do corpo já codificado. */
async function publishStory(eventId: string, file: File | null = webp(), field = "file") {
  const form = new FormData();
  if (file) form.append(field, file);
  const encoded = new Response(form);
  const body = await encoded.arrayBuffer();
  return sendToStories(eventId, body, {
    "content-type": encoded.headers.get("content-type") ?? "",
    "content-length": String(body.byteLength),
  });
}

/** Os ficheiros de stories que existem em disco para o evento. */
async function storyFiles(eventId: string) {
  return readdir(path.join(uploads.dir, "stories", eventId)).catch(() => [] as string[]);
}

/** Cria `count` stories já gravadas na base de dados para o autor, ativas ou expiradas. */
async function seedStories(eventId: string, authorUserId: string, count: number, { expired = false } = {}) {
  const now = Date.now();
  await prisma.story.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      eventId,
      authorUserId,
      storageKey: `stories/${eventId}/seed-${authorUserId.slice(0, 6)}-${expired ? "old" : "new"}-${index}.webp`,
      contentType: "image/webp",
      createdAtUtc: new Date(now - (expired ? 2 * DAY_MS : 1000)),
      expiresAtUtc: new Date(now + (expired ? -DAY_MS : DAY_MS)),
    })),
  });
}

describe("publishing a story", () => {
  it("keeps the image for 24 hours and never exposes where it is stored", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    signInAs(member);

    const { status, body } = await publishStory(event.id);

    expect(status).toBe(201);
    const story = await prisma.story.findFirstOrThrow({ where: { authorUserId: member.id } });
    expect(story.storageKey).toMatch(new RegExp(`^stories/${event.id}/[a-f0-9]+\\.webp$`));
    expect(story.expiresAtUtc.getTime() - Date.now()).toBeGreaterThan(DAY_MS - 60_000);
    expect(story.expiresAtUtc.getTime() - Date.now()).toBeLessThanOrEqual(DAY_MS);
    expect(body).toMatchObject({ id: story.id });
    expect(JSON.stringify(body)).not.toContain("stories/");
    expect(await storyFiles(event.id)).toEqual([path.basename(story.storageKey)]);
  });

  it.each([
    ["a gif", new File([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], "a.gif", { type: "image/gif" })],
    ["text pretending to be a png", new File(["<script>alert(1)</script>"], "a.png", { type: "image/png" })],
    ["an image over 4 MB", webp(4 * MB + 1)],
  ])("refuses %s and leaves nothing behind", async (_label, file) => {
    const event = await createEvent();
    signInAs(await createMember(event.id));

    const { status } = await publishStory(event.id, file);

    expect(status).toBe(400);
    expect(await prisma.story.count()).toBe(0);
    expect(await storyFiles(event.id)).toEqual([]);
  });

  it("answers 413 for a request bigger than the platform accepts, before looking at the file", async () => {
    const event = await createEvent();
    signInAs(await createMember(event.id));

    const { status, body } = await publishStory(event.id, webp(5 * MB));

    expect(status).toBe(413);
    expect(body).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    expect(await storyFiles(event.id)).toEqual([]);
  });

  it("answers 400, not a server error, to a request that is not a form", async () => {
    const event = await createEvent();
    signInAs(await createMember(event.id));
    const json = new TextEncoder().encode("{}");

    const { status } = await sendToStories(event.id, json.buffer as ArrayBuffer, {
      "content-type": "application/json",
      "content-length": String(json.byteLength),
    });

    expect(status).toBe(400);
  });

  it("answers 411 when the request does not say how big it is, instead of reading it all into memory", async () => {
    const event = await createEvent();
    signInAs(await createMember(event.id));
    const form = new FormData();
    form.append("file", webp());
    const encoded = new Response(form);

    const { status, body } = await sendToStories(event.id, await encoded.arrayBuffer(), {
      "content-type": encoded.headers.get("content-type") ?? "",
    });

    expect(status).toBe(411);
    expect(body).toMatchObject({ code: "LENGTH_REQUIRED" });
    expect(await storyFiles(event.id)).toEqual([]);
  });

  it("asks for a file when none is sent", async () => {
    const event = await createEvent();
    signInAs(await createMember(event.id));

    expect((await publishStory(event.id, null)).status).toBe(400);
  });
});

describe("a failure after the story was saved", () => {
  it("keeps the image when the database committed but the answer was lost, so the story does not break", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    signInAs(member);
    const commit = prisma.$transaction.bind(prisma) as (...args: unknown[]) => Promise<unknown>;
    vi.spyOn(prisma, "$transaction").mockImplementationOnce((async (...args: unknown[]) => {
      await commit(...args);
      throw new Error("connection lost after the commit");
    }) as never);

    const { status } = await publishStory(event.id);

    expect(status).toBe(500);
    const story = await prisma.story.findFirstOrThrow({ where: { authorUserId: member.id } });
    expect(await storyFiles(event.id)).toEqual([path.basename(story.storageKey)]);
  });
});

describe("the limit of active stories", () => {
  it("stops at ten active stories and removes the file it had already stored", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    await seedStories(event.id, member.id, 10);
    signInAs(member);

    const { status, body } = await publishStory(event.id);

    expect(status).toBe(409);
    expect(body).toMatchObject({ code: "STORY_LIMIT_REACHED" });
    expect(await prisma.story.count()).toBe(10);
    expect(await storyFiles(event.id)).toEqual([]);
  });

  it("says the limit is reached before looking at the file, so nothing is stored just to be thrown away", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    await seedStories(event.id, member.id, 10);
    signInAs(member);
    const gif = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], "a.gif", { type: "image/gif" });

    const { status, body } = await publishStory(event.id, gif);

    expect(status).toBe(409);
    expect(body).toMatchObject({ code: "STORY_LIMIT_REACHED" });
  });

  it("removes the author's expired stories with their files, so Docker and local installs need no cron", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    const other = await createMember(event.id);
    const old = await uploads.seedStory(event.id, member.id, { expired: true });
    const othersOld = await uploads.seedStory(event.id, other.id, { expired: true });
    signInAs(member);

    expect((await publishStory(event.id)).status).toBe(201);

    expect(existsSync(old.filePath)).toBe(false);
    expect(await prisma.story.findUnique({ where: { id: old.id } })).toBeNull();
    // Só limpa o que é do próprio autor: o resto fica para o cron.
    expect(existsSync(othersOld.filePath)).toBe(true);
    expect(await prisma.story.findUnique({ where: { id: othersOld.id } })).not.toBeNull();
  });

  it("publishes anyway when the old files cannot be removed", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    const broken = await uploads.seedStory(event.id, member.id, { expired: true, withFile: false });
    await mkdir(path.join(uploads.dir, broken.storageKey), { recursive: true });
    signInAs(member);

    expect((await publishStory(event.id)).status).toBe(201);
    expect(await prisma.story.findUnique({ where: { id: broken.id } })).not.toBeNull();
  });

  it("refuses an event id that cannot be a storage folder, before storing anything", async () => {
    const member = await createMember((await createEvent()).id);
    const countFiles = async () =>
      (await readdir(uploads.dir, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile()).length;
    const before = await countFiles();

    await expect(createStory("%20", member.id, webp())).rejects.toMatchObject({ status: 404 });
    expect(await countFiles()).toBe(before);
  });

  it("does not count expired stories", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    await seedStories(event.id, member.id, 10, { expired: true });
    signInAs(member);

    expect((await publishStory(event.id)).status).toBe(201);
  });

  it("counts each member on their own", async () => {
    const event = await createEvent();
    const full = await createMember(event.id);
    const other = await createMember(event.id);
    await seedStories(event.id, full.id, 10);
    signInAs(other);

    expect((await publishStory(event.id)).status).toBe(201);
  });

  it("lets only one of several simultaneous uploads take the last place", async () => {
    const event = await createEvent();
    const member = await createMember(event.id);
    await seedStories(event.id, member.id, 9);
    signInAs(member);

    const results = await Promise.all(Array.from({ length: 5 }, () => publishStory(event.id)));

    expect(results.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(results.filter(({ status }) => status === 409)).toHaveLength(4);
    expect(await prisma.story.count({ where: { authorUserId: member.id } })).toBe(10);
    expect(await storyFiles(event.id)).toHaveLength(1);
  });
});
