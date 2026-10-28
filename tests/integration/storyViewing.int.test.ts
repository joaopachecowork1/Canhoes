import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { DELETE as deleteStory } from "@/app/api/v1/events/[eventId]/stories/[storyId]/route";
import { GET as getStoryMedia } from "@/app/api/v1/events/[eventId]/stories/[storyId]/media/route";
import { GET as getStories } from "@/app/api/v1/events/[eventId]/stories/route";
import type { StoryAuthorDto } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, createUser, randomIp, signInAs } from "./helpers";
import { IMAGE_BYTES, withTempUploadsDir } from "./storySeed";

const uploads = withTempUploadsDir("canhoes-story-viewing-");
const { seedStory } = uploads;

/** Pede a imagem de uma story como o browser faz com um `<img>`. */
async function requestMedia(eventId: string, storyId: string) {
  return getStoryMedia(new NextRequest("http://localhost/api/test", { headers: { "x-forwarded-for": randomIp() } }), {
    params: Promise.resolve({ eventId, storyId }),
  });
}

describe("listing the stories", () => {
  it("groups the active stories by member, the freshest member first, without exposing storage keys", async () => {
    const event = await createEvent();
    const ana = await createMember(event.id, "Ana");
    const rui = await createMember(event.id, "Rui");
    await seedStory(event.id, ana.id, { ageMs: 5 * 60_000 });
    await seedStory(event.id, ana.id, { ageMs: 60_000 });
    await seedStory(event.id, rui.id, { ageMs: 2 * 60_000 });
    await seedStory(event.id, ana.id, { expired: true });
    signInAs(await createMember(event.id));

    const { status, body } = await callRoute(getStories, { eventId: event.id });

    expect(status).toBe(200);
    const groups = body as StoryAuthorDto[];
    expect(groups.map((group) => [group.authorName, group.stories.length])).toEqual([
      ["Ana", 2],
      ["Rui", 1],
    ]);
    expect(groups[0]?.stories[0]?.mediaUrl).toMatch(new RegExp(`^/api/v1/events/${event.id}/stories/[\\w-]+/media$`));
    expect(JSON.stringify(body)).not.toContain("stories/" + event.id + "/");
  });

  it("does not show the stories of someone who left the event, nor those of another event", async () => {
    const event = await createEvent();
    const otherEvent = await createEvent();
    const gone = await createMember(event.id, "Saiu");
    const outsider = await createMember(otherEvent.id, "Outro");
    await seedStory(event.id, gone.id);
    await seedStory(otherEvent.id, outsider.id);
    await prisma.eventMember.deleteMany({ where: { eventId: event.id, userId: gone.id } });
    signInAs(await createMember(event.id));

    const { body } = await callRoute(getStories, { eventId: event.id });

    expect(body).toEqual([]);
  });

  it("shows the stories of an admin who is not a member", async () => {
    const event = await createEvent();
    const admin = await createUser({ isAdmin: true, name: "Admin" });
    await seedStory(event.id, admin.id);
    signInAs(await createMember(event.id));

    const { body } = await callRoute(getStories, { eventId: event.id });

    expect((body as StoryAuthorDto[]).map((group) => group.authorName)).toEqual(["Admin"]);
  });
});

describe("serving a story image", () => {
  it("sends the image to a member, never cached and never sniffed", async () => {
    const event = await createEvent();
    const story = await seedStory(event.id, (await createMember(event.id)).id);
    signInAs(await createMember(event.id));

    const response = await requestMedia(event.id, story.id);

    expect(response.status).toBe(200);
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([...IMAGE_BYTES]);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("answers 404 once the story has expired, even though the file is still stored", async () => {
    const event = await createEvent();
    const story = await seedStory(event.id, (await createMember(event.id)).id, { expired: true });
    signInAs(await createMember(event.id));

    expect(existsSync(story.filePath)).toBe(true);
    expect((await requestMedia(event.id, story.id)).status).toBe(404);
  });

  it("answers 404 for a story of another event, so an event id in the URL cannot unlock it", async () => {
    const event = await createEvent();
    const otherEvent = await createEvent();
    const story = await seedStory(otherEvent.id, (await createMember(otherEvent.id)).id);
    signInAs(await createMember(event.id));

    expect((await requestMedia(event.id, story.id)).status).toBe(404);
  });

  it("answers 404 for an unknown story, for an author who left and for a file already gone", async () => {
    const event = await createEvent();
    const gone = await createMember(event.id);
    const leftStory = await seedStory(event.id, gone.id);
    const missingFile = await seedStory(event.id, (await createMember(event.id)).id, { withFile: false });
    await prisma.eventMember.deleteMany({ where: { eventId: event.id, userId: gone.id } });
    signInAs(await createMember(event.id));

    expect((await requestMedia(event.id, randomUUID())).status).toBe(404);
    expect((await requestMedia(event.id, leftStory.id)).status).toBe(404);
    expect((await requestMedia(event.id, missingFile.id)).status).toBe(404);
  });
});

describe("deleting a story", () => {
  it("lets the author delete it, image included", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const story = await seedStory(event.id, author.id);
    signInAs(author);

    const { status } = await callRoute(deleteStory, { eventId: event.id, storyId: story.id }, { method: "DELETE" });

    expect(status).toBe(204);
    expect(await prisma.story.count()).toBe(0);
    expect(existsSync(story.filePath)).toBe(false);
  });

  it("lets an admin delete anyone's story", async () => {
    const event = await createEvent();
    const story = await seedStory(event.id, (await createMember(event.id)).id);
    signInAs(await createUser({ isAdmin: true }));

    const { status } = await callRoute(deleteStory, { eventId: event.id, storyId: story.id }, { method: "DELETE" });

    expect(status).toBe(204);
    expect(await prisma.story.count()).toBe(0);
  });

  it("refuses another member and keeps both the row and the image", async () => {
    const event = await createEvent();
    const story = await seedStory(event.id, (await createMember(event.id)).id);
    signInAs(await createMember(event.id));

    const { status } = await callRoute(deleteStory, { eventId: event.id, storyId: story.id }, { method: "DELETE" });

    expect(status).toBe(403);
    expect(await prisma.story.count()).toBe(1);
    expect(existsSync(story.filePath)).toBe(true);
  });

  it("answers 404 for an unknown story and for one that belongs to another event", async () => {
    const event = await createEvent();
    const otherEvent = await createEvent();
    const author = await createMember(otherEvent.id);
    const story = await seedStory(otherEvent.id, author.id);
    signInAs(await createMember(event.id));

    expect(
      (await callRoute(deleteStory, { eventId: event.id, storyId: randomUUID() }, { method: "DELETE" })).status,
    ).toBe(404);
    expect((await callRoute(deleteStory, { eventId: event.id, storyId: story.id }, { method: "DELETE" })).status).toBe(
      404,
    );
    expect(await prisma.story.count()).toBe(1);
  });

  it("keeps the row when the image cannot be removed, so the deletion can be repeated", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const story = await seedStory(event.id, author.id, { withFile: false });
    // Um diretório no lugar do ficheiro faz o apagar falhar com um erro real.
    await mkdir(path.join(uploads.dir, story.storageKey), { recursive: true });
    signInAs(author);

    const { status } = await callRoute(deleteStory, { eventId: event.id, storyId: story.id }, { method: "DELETE" });

    expect(status).toBe(500);
    expect(await prisma.story.count()).toBe(1);
  });

  it("still lets the author take a story down when an admin has closed the mural", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const story = await seedStory(event.id, author.id);
    await prisma.canhoesEventState.update({
      where: { eventId: event.id },
      data: { moduleVisibilityJson: { feed: false } },
    });
    signInAs(author);

    expect((await callRoute(getStories, { eventId: event.id })).status).toBe(403);
    const { status } = await callRoute(deleteStory, { eventId: event.id, storyId: story.id }, { method: "DELETE" });

    expect(status).toBe(204);
    expect(await prisma.story.count()).toBe(0);
  });

  it("deletes the row of a story whose key points outside the stories folder, instead of failing for ever", async () => {
    const event = await createEvent();
    const author = await createMember(event.id);
    const story = await seedStory(event.id, author.id, { withFile: false });
    const feedFile = path.join(uploads.dir, "feed", event.id, "photo.webp");
    await mkdir(path.dirname(feedFile), { recursive: true });
    await writeFile(feedFile, IMAGE_BYTES);
    await prisma.story.update({ where: { id: story.id }, data: { storageKey: `feed/${event.id}/photo.webp` } });
    signInAs(author);

    const { status } = await callRoute(deleteStory, { eventId: event.id, storyId: story.id }, { method: "DELETE" });

    expect(status).toBe(204);
    expect(await prisma.story.count()).toBe(0);
    expect(existsSync(feedFile)).toBe(true);
  });
});
