"use client";


export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const TARGET_UPLOAD_MB = 2.5;
const TARGET_UPLOAD_BYTES = TARGET_UPLOAD_MB * 1024 * 1024;
const TARGET_MAX_DIMENSION = 1600;
const TARGET_QUALITY = 0.8;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ACCEPTED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
]);

const TRANSCODE_IMAGE_TYPES = new Set(["image/heic", "image/heif"]);

function fileExtension(name: string) {
  const extensionStart = name.lastIndexOf(".");
  if (extensionStart < 0) return "";
  return name.slice(extensionStart + 1).toLowerCase();
}

export function isAcceptedImage(file: File) {
  const mimeType = (file.type || "").toLowerCase();
  if (mimeType && ACCEPTED_IMAGE_TYPES.has(mimeType)) return true;
  return ACCEPTED_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

function shouldTranscode(file: File) {
  const mimeType = (file.type || "").toLowerCase();
  if (TRANSCODE_IMAGE_TYPES.has(mimeType)) return true;
  return ["heic", "heif"].includes(fileExtension(file.name));
}

function supportsWebpEncode() {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

async function decodeImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    if ("createImageBitmap" in globalThis) {
      const bitmap = await createImageBitmap(file);

      return {
        draw: (context: CanvasRenderingContext2D, width: number, height: number) => {
          context.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
        },
        height: bitmap.height,
        width: bitmap.width,
      };
    }

    const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImageElement = new Image();
      nextImageElement.onload = () => resolve(nextImageElement);
      nextImageElement.onerror = reject;
      nextImageElement.decoding = "async";
      nextImageElement.src = objectUrl;
    });

    return {
      draw: (context: CanvasRenderingContext2D, width: number, height: number) => {
        context.drawImage(imageElement, 0, 0, width, height);
      },
      height: imageElement.naturalHeight,
      width: imageElement.naturalWidth,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function normalizeUploadImage(file: File) {
  const mustTranscode = shouldTranscode(file);

  if (!mustTranscode && file.size <= TARGET_UPLOAD_BYTES) return file;

  try {
    const sourceImage = await decodeImage(file);
    const scale = Math.min(1, TARGET_MAX_DIMENSION / Math.max(sourceImage.width, sourceImage.height));
    const targetWidth = Math.max(1, Math.round(sourceImage.width * scale));
    const targetHeight = Math.max(1, Math.round(sourceImage.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;

    sourceImage.draw(context, targetWidth, targetHeight);

    const mimeType = supportsWebpEncode() ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, TARGET_QUALITY));

    if (!blob) return file;
    if (!mustTranscode && blob.size >= file.size) return file;

    const extension = mimeType === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return new File([blob], `${baseName}.${extension}`, {
      lastModified: Date.now(),
      type: mimeType,
    });
  } catch {
    return file;
  }
}
