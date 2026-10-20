"use client";

/** O tamanho máximo, em MB, de uma imagem escolhida. */
export const MAX_FILE_MB = 10;
/** O tamanho máximo, em bytes, de uma imagem escolhida. */
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

// acima destes limites a imagem é redimensionada e comprimida antes do envio
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

const ACCEPTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

const TRANSCODE_IMAGE_TYPES = new Set(["image/heic", "image/heif"]);

/** A extensão do ficheiro em minúsculas, ou texto vazio se não tiver. */
function fileExtension(name: string) {
  const extensionStart = name.lastIndexOf(".");
  if (extensionStart < 0) return "";
  return name.slice(extensionStart + 1).toLowerCase();
}

/** Diz se o ficheiro é um formato de imagem aceite, pelo tipo MIME ou, em falta dele, pela extensão. */
export function isAcceptedImage(file: File) {
  const mimeType = (file.type || "").toLowerCase();
  if (mimeType && ACCEPTED_IMAGE_TYPES.has(mimeType)) return true;
  return ACCEPTED_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

/** Diz se o ficheiro (HEIC/HEIF) tem de ser convertido porque os navegadores não o mostram. */
function shouldTranscode(file: File) {
  const mimeType = (file.type || "").toLowerCase();
  if (TRANSCODE_IMAGE_TYPES.has(mimeType)) return true;
  return ["heic", "heif"].includes(fileExtension(file.name));
}

/** Diz se o navegador consegue codificar WebP. */
function supportsWebpEncode() {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

/** Descodifica a imagem e devolve as dimensões e uma função para a desenhar num canvas. */
async function decodeImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    // caminho rápido; o `Image` é o recurso para navegadores sem `createImageBitmap`
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

/** Reduz e comprime a imagem (WebP ou JPEG) antes do envio; em qualquer falha devolve o original. */
export async function normalizeUploadImage(file: File) {
  const mustTranscode = shouldTranscode(file);

  if (!mustTranscode && file.size <= TARGET_UPLOAD_BYTES) return file;

  try {
    // nunca amplia: a escala máxima é 1
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

    // só troca o original se ficar mais pequeno, exceto HEIC/HEIF que tem de ser convertido
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
