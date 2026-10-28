import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getUpload } from "@/app/api/uploads/[...path]/route";

import { createEvent } from "./helpers";
import { withTempUploadsDir } from "./storySeed";

const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

const uploads = withTempUploadsDir("canhoes-public-uploads-");

describe("the public uploads route", () => {
  /** Pede um ficheiro à rota pública `/uploads/...` como o browser faz. */
  async function requestPublicUpload(...segments: string[]) {
    const response = await getUpload(new NextRequest(`http://localhost/uploads/${segments.join("/")}`), {
      params: Promise.resolve({ path: segments }),
    });
    return response.status;
  }

  it("does not serve story images, which only the members of the event may see", async () => {
    const event = await createEvent();
    await mkdir(path.join(uploads.dir, "stories", event.id), { recursive: true });
    await writeFile(path.join(uploads.dir, "stories", event.id, "secret.webp"), Uint8Array.from(WEBP_HEAD));

    expect(await requestPublicUpload("stories", event.id, "secret.webp")).toBe(404);
  });

  it("does not serve them under another spelling of the folder, which a case-insensitive disk would still resolve", async () => {
    const event = await createEvent();
    await mkdir(path.join(uploads.dir, "Stories", event.id), { recursive: true });
    await writeFile(path.join(uploads.dir, "Stories", event.id, "secret.webp"), Uint8Array.from(WEBP_HEAD));

    expect(await requestPublicUpload("Stories", event.id, "secret.webp")).toBe(404);
    expect(await requestPublicUpload("STORIES", event.id, "secret.webp")).toBe(404);
  });

  it("refuses a path that climbs out of its folder instead of resolving it into the stories folder", async () => {
    const event = await createEvent();
    await mkdir(path.join(uploads.dir, "stories", event.id), { recursive: true });
    await writeFile(path.join(uploads.dir, "stories", event.id, "secret.webp"), Uint8Array.from(WEBP_HEAD));

    expect(await requestPublicUpload("feed", "..", "stories", event.id, "secret.webp")).toBe(400);
  });

  it("keeps serving the other uploads", async () => {
    const event = await createEvent();
    await mkdir(path.join(uploads.dir, "feed", event.id), { recursive: true });
    await writeFile(path.join(uploads.dir, "feed", event.id, "photo.webp"), Uint8Array.from(WEBP_HEAD));

    expect(await requestPublicUpload("feed", event.id, "photo.webp")).toBe(200);
  });
});
