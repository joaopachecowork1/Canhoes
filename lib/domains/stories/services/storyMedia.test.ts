import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { removeStoryFile } from "./storyMedia";

let uploadsRoot: string;

/** Cria um ficheiro de teste dentro da pasta de uploads e devolve o caminho físico. */
async function createUpload(key: string) {
  const physical = path.join(uploadsRoot, key);
  await mkdir(path.dirname(physical), { recursive: true });
  await writeFile(physical, "bytes");
  return physical;
}

const story = (storageKey: string) => ({ id: "story-1", eventId: "event-1", storageKey });

beforeEach(async () => {
  uploadsRoot = await mkdtemp(path.join(os.tmpdir(), "canhoes-stories-"));
  process.env.UPLOADS_DIR = uploadsRoot;
});

afterEach(async () => {
  delete process.env.UPLOADS_DIR;
  await rm(uploadsRoot, { recursive: true, force: true });
});

describe("removeStoryFile", () => {
  it("removes the file of the story", async () => {
    const physical = await createUpload("stories/event-1/0a1b2c.webp");

    await removeStoryFile(story("stories/event-1/0a1b2c.webp"));

    expect(existsSync(physical)).toBe(false);
  });

  it("succeeds when the file is already gone, so a cleanup can be repeated", async () => {
    await expect(removeStoryFile(story("stories/event-1/missing.webp"))).resolves.toBeUndefined();
  });

  it.each([
    ["belongs to another event", "stories/event-2/0a1b2c.webp"],
    ["points at the feed media", "feed/event-1/0a1b2c.webp"],
  ])("leaves alone a file whose key %s, so only the row goes", async (_label, key) => {
    const physical = await createUpload(key);

    await expect(removeStoryFile(story(key))).resolves.toBeUndefined();

    expect(existsSync(physical)).toBe(true);
  });

  it("surfaces a real failure instead of hiding it", async () => {
    // Um diretório no lugar do ficheiro faz o unlink falhar com um erro que não é "não existe".
    await mkdir(path.join(uploadsRoot, "stories/event-1/0a1b2c.webp"), { recursive: true });

    await expect(removeStoryFile(story("stories/event-1/0a1b2c.webp"))).rejects.toThrow();
  });
});
