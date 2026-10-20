import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteUpload, readUpload, saveUpload, UploadValidationError } from "./localStorage";

let testRoot: string;

beforeEach(async () => {
  testRoot = await mkdtemp(path.join(os.tmpdir(), "canhoes-uploads-"));
  process.env.UPLOADS_DIR = testRoot;
});

afterEach(async () => {
  delete process.env.UPLOADS_DIR;
  await rm(testRoot, { recursive: true, force: true });
});

describe("local upload storage", () => {
  it("stores, reads and deletes an image", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "sample.png", {
      type: "image/png",
    });

    const saved = await saveUpload(file, ["events", "event-1"]);
    expect(saved.url).toMatch(/^\/uploads\/events\/event-1\/[a-f0-9]+\.png$/);

    const stored = await readUpload(saved.url.replace("/uploads/", "").split("/"));
    expect(stored.contentType).toBe("image/png");
    expect([...stored.buffer]).toEqual([137, 80, 78, 71]);

    await deleteUpload(saved.url);
    await expect(readUpload(saved.url.replace("/uploads/", "").split("/"))).rejects.toThrow();
  });

  it("rejects a file whose bytes are not the image its type claims", async () => {
    const disguised = new File(["<script>alert(1)</script>"], "payload.png", { type: "image/png" });
    await expect(saveUpload(disguised, ["events"])).rejects.toBeInstanceOf(UploadValidationError);
  });

  it.each([
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
    ["image/gif", [0x47, 0x49, 0x46, 0x38]],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ])("accepts real %s bytes", async (type, bytes) => {
    await expect(saveUpload(new File([new Uint8Array(bytes)], "image", { type }), ["events"])).resolves.toMatchObject({
      contentType: type,
    });
  });

  it("rejects unsupported files", async () => {
    const file = new File(["not an image"], "payload.txt", { type: "text/plain" });
    await expect(saveUpload(file, ["events"])).rejects.toBeInstanceOf(UploadValidationError);
  });

  it("blocks paths outside the configured storage root", async () => {
    await expect(readUpload(["..", "secret.txt"])).rejects.toBeInstanceOf(UploadValidationError);
  });
});
