import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { HttpError } from "@/lib/api/httpError";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

// The first bytes of each format, so a file cannot pass as an image just by claiming a type. WebP also has "WEBP" at byte 8.
const SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};
const WEBP_MARK = [0x57, 0x45, 0x42, 0x50];

function hasImageSignature(type: string, bytes: Uint8Array) {
  const startsRight = SIGNATURES[type]?.every((byte, index) => bytes[index] === byte);
  return Boolean(startsRight) && (type !== "image/webp" || WEBP_MARK.every((byte, index) => bytes[8 + index] === byte));
}

/** A rejected upload (type, size or path). Becomes a 400 in route handlers. */
export class UploadValidationError extends HttpError {
  constructor(message: string) {
    super(400, "VALIDATION_ERROR", message);
  }
}

// Resolved at runtime; the ignore comment stops Turbopack from tracing the whole project into the build.
function storageRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(process.cwd(), ".data", "uploads"));
}

function safePath(segments: string[]) {
  const root = storageRoot();
  const target = path.resolve(root, ...segments);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new UploadValidationError("Invalid upload path.");
  }
  return target;
}

/** Stores an image (JPEG, PNG, GIF or WebP, up to 10 MB) under `UPLOADS_DIR` and returns its public `/uploads/...` URL. */
export async function saveUpload(file: File, folders: string[]) {
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) throw new UploadValidationError("Unsupported image type.");
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("Image must be between 1 byte and 10 MB.");
  }

  const content = new Uint8Array(await file.arrayBuffer());
  if (!hasImageSignature(file.type, content)) throw new UploadValidationError("The file is not a valid image.");

  const fileName = `${crypto.randomUUID().replaceAll("-", "")}${extension}`;
  const cleanFolders = folders.map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""));
  const target = safePath([...cleanFolders, fileName]);
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, target);

  return {
    url: `/uploads/${[...cleanFolders, fileName].join("/")}`,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
  };
}

/** Reads a stored upload and its content type; the path cannot leave `UPLOADS_DIR`. */
export async function readUpload(segments: string[]) {
  const physicalPath = safePath(segments);
  const extension = path.extname(physicalPath).toLowerCase();
  const contentType = Object.entries(ALLOWED_TYPES).find(([, ext]) => ext === extension)?.[0]
    ?? "application/octet-stream";
  return { buffer: await readFile(physicalPath), contentType };
}

/** Deletes a stored upload by its `/uploads/...` URL; other URLs and missing files are ignored. */
export async function deleteUpload(url: string) {
  const prefix = "/uploads/";
  if (!url.startsWith(prefix)) return;
  const segments = url.slice(prefix.length).split("/").filter(Boolean);
  await unlink(safePath(segments)).catch(() => undefined);
}
