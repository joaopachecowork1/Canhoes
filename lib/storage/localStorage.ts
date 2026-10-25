import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { HttpError } from "@/lib/api/httpError";
import { deleteCloudUpload, isCloudStorageConfigured, readCloudUpload, saveCloudUpload } from "./cloudStorage";

// Tamanho máximo de uma imagem: 10 MB.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// Tipos de imagem aceites e a extensão com que são guardados.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

// Os primeiros bytes de cada formato, para um ficheiro não passar por imagem só por declarar um tipo. O WebP tem também "WEBP" no byte 8.
const SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};
const WEBP_MARK = [0x57, 0x45, 0x42, 0x50];

/** Confirma que o conteúdo começa com os bytes do formato declarado. */
function hasImageSignature(type: string, bytes: Uint8Array) {
  const startsRight = SIGNATURES[type]?.every((byte, index) => bytes[index] === byte);
  return Boolean(startsRight) && (type !== "image/webp" || WEBP_MARK.every((byte, index) => bytes[8 + index] === byte));
}

/** Um upload recusado (tipo, tamanho ou caminho). Nos route handlers vira um 400. */
export class UploadValidationError extends HttpError {
  constructor(message: string) {
    super(400, "VALIDATION_ERROR", message);
  }
}

// Resolvido em runtime; o comentário de ignorar impede o Turbopack de incluir o projeto inteiro no build.
function storageRoot() {
  return path.resolve(
    /*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(process.cwd(), ".data", "uploads"),
  );
}

// Caracteres permitidos em cada segmento do caminho: letras, números, hífen, underscore e extensão.
const SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/;

/** Confirma que todos os segmentos contêm apenas caracteres seguros. */
function validateSegments(segments: string[]) {
  if (segments.length === 0 || segments.some((segment) => !SEGMENT_PATTERN.test(segment))) {
    throw new UploadValidationError("Invalid upload path.");
  }
}

/** Junta os segmentos à pasta de uploads e recusa qualquer caminho que saia dela (por ex. com `..`). */
function safePath(segments: string[]) {
  validateSegments(segments);
  const root = storageRoot();
  const target = path.resolve(root, ...segments);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new UploadValidationError("Invalid upload path.");
  }
  return target;
}

/** Guarda uma imagem (JPEG, PNG, GIF ou WebP, até 10 MB) localmente ou no R2/S3 e devolve o URL público `/uploads/...`. */
export async function saveUpload(file: File, folders: string[]) {
  // Validação: tipo declarado, tamanho e assinatura real do conteúdo.
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) throw new UploadValidationError("Unsupported image type.");
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("Image must be between 1 byte and 10 MB.");
  }

  const content = new Uint8Array(await file.arrayBuffer());
  if (!hasImageSignature(file.type, content)) throw new UploadValidationError("The file is not a valid image.");

  if (isCloudStorageConfigured()) {
    return saveCloudUpload(file, folders, content, extension);
  }

  // Nome aleatório e pastas limpas de tudo o que não seja letra, número, _ ou -.
  const fileName = `${crypto.randomUUID().replaceAll("-", "")}${extension}`;
  const cleanFolders = folders.map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""));
  const target = safePath([...cleanFolders, fileName]);
  // Escreve primeiro num ficheiro temporário e renomeia no fim, para nunca se ler um ficheiro a meio.
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

/** Lê um upload guardado e o seu tipo de conteúdo; o caminho não pode sair de `UPLOADS_DIR`. */
export async function readUpload(segments: string[]) {
  validateSegments(segments);

  if (isCloudStorageConfigured()) {
    return readCloudUpload(segments.join("/"));
  }

  const physicalPath = safePath(segments);
  const extension = path.extname(physicalPath).toLowerCase();
  const contentType =
    Object.entries(ALLOWED_TYPES).find(([, ext]) => ext === extension)?.[0] ?? "application/octet-stream";
  return { buffer: await readFile(physicalPath), contentType };
}

/** Apaga um upload pelo seu URL `/uploads/...`; outros URLs e ficheiros inexistentes são ignorados. */
export async function deleteUpload(url: string) {
  const prefix = "/uploads/";
  if (!url.startsWith(prefix)) return;
  const key = url.slice(prefix.length);
  const segments = key.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => !SEGMENT_PATTERN.test(segment))) return;

  if (isCloudStorageConfigured()) {
    await deleteCloudUpload(segments.join("/"));
    return;
  }

  await unlink(safePath(segments)).catch(() => undefined);
}
