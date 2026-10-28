// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAcceptedImage, normalizeUploadImage } from "./uploadImage";

const MB = 1024 * 1024;

function fileOf(name: string, type: string, size: number) {
  return new File([new Uint8Array(size)], name, { type });
}

/** A canvas that encodes to `encodedSize` bytes, and webp support as asked. */
function stubCanvas({
  encodedSize,
  webp = true,
  hasContext = true,
}: {
  encodedSize: number | null;
  webp?: boolean;
  hasContext?: boolean;
}) {
  const drawImage = vi.fn();
  // getContext is overloaded per context kind; the 2D stub only needs drawImage.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() =>
    hasContext ? { drawImage } : null) as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    webp ? "data:image/webp;base64," : "data:image/png;base64,",
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback, type) {
    callback(encodedSize === null ? null : new Blob([new Uint8Array(encodedSize)], { type }));
  });
  return { drawImage };
}

describe("isAcceptedImage", () => {
  it.each([
    [fileOf("a.jpg", "image/jpeg", 1), true],
    [fileOf("foto.HEIC", "", 1), true],
    [fileOf("notas.txt", "text/plain", 1), false],
    [fileOf("sem-extensao", "", 1), false],
  ])("%o → %s", (file, expected) => {
    expect(isAcceptedImage(file)).toBe(expected);
  });
});

describe("normalizeUploadImage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 3200, height: 1600, close: vi.fn() })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps small images as they are", async () => {
    const small = fileOf("a.jpg", "image/jpeg", MB);
    expect(await normalizeUploadImage(small)).toBe(small);
  });

  it("shrinks large images to 1600px webp", async () => {
    const { drawImage } = stubCanvas({ encodedSize: MB });

    const result = await normalizeUploadImage(fileOf("praia.png", "image/png", 5 * MB));

    expect(result).toMatchObject({ name: "praia.webp", type: "image/webp", size: MB });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 800);
  });

  it("falls back to jpeg where webp cannot be encoded", async () => {
    stubCanvas({ encodedSize: MB, webp: false });
    expect(await normalizeUploadImage(fileOf("praia.png", "image/png", 5 * MB))).toMatchObject({
      name: "praia.jpg",
      type: "image/jpeg",
    });
  });

  it("always converts HEIC, even when small", async () => {
    stubCanvas({ encodedSize: 2 * MB });
    expect(await normalizeUploadImage(fileOf("foto.heic", "image/heic", MB))).toMatchObject({ name: "foto.webp" });
  });

  it("keeps the original when re-encoding would not make it smaller", async () => {
    stubCanvas({ encodedSize: 6 * MB });
    const large = fileOf("praia.png", "image/png", 5 * MB);
    expect(await normalizeUploadImage(large)).toBe(large);
  });

  it("re-encodes even a small image when asked, so the photo metadata (GPS, EXIF) is dropped", async () => {
    stubCanvas({ encodedSize: MB / 2 });
    const small = fileOf("a.jpg", "image/jpeg", MB);

    expect(await normalizeUploadImage(small, { alwaysReencode: true })).toMatchObject({ name: "a.webp", size: MB / 2 });
  });

  it("re-encodes when asked even if the result is not smaller, since the metadata still has to go", async () => {
    stubCanvas({ encodedSize: 2 * MB });
    const small = fileOf("a.jpg", "image/jpeg", MB);

    expect(await normalizeUploadImage(small, { alwaysReencode: true })).toMatchObject({ name: "a.webp", size: 2 * MB });
  });

  it("refuses to send the original when asked to re-encode and the browser cannot, so the metadata never leaves", async () => {
    const small = fileOf("a.jpg", "image/jpeg", MB);

    stubCanvas({ encodedSize: MB, hasContext: false });
    await expect(normalizeUploadImage(small, { alwaysReencode: true })).rejects.toThrow();

    vi.restoreAllMocks();
    stubCanvas({ encodedSize: null });
    await expect(normalizeUploadImage(small, { alwaysReencode: true })).rejects.toThrow();

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => Promise.reject(new Error("decode"))),
    );
    await expect(normalizeUploadImage(small, { alwaysReencode: true })).rejects.toThrow();
  });

  it("keeps the original when the browser cannot draw or encode it", async () => {
    const large = fileOf("praia.png", "image/png", 5 * MB);

    stubCanvas({ encodedSize: MB, hasContext: false });
    expect(await normalizeUploadImage(large)).toBe(large);

    vi.restoreAllMocks();
    stubCanvas({ encodedSize: null });
    expect(await normalizeUploadImage(large)).toBe(large);

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => Promise.reject(new Error("decode"))),
    );
    expect(await normalizeUploadImage(large)).toBe(large);
  });
});
