import { NextResponse } from "next/server";

import { notFound } from "@/lib/api/httpError";
import { apiRoute } from "@/lib/api/route";
import { logger } from "@/lib/logger";
import { readUpload, UploadValidationError } from "@/lib/storage/localStorage";

// Cache de um dia no browser.
const ONE_DAY_IN_SECONDS = 86_400;

function isNotFoundError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const err = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.code === "ENOENT" || err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return true;
    }
  }
  return false;
}

/** GET /uploads/:path: serve um ficheiro carregado, com cache longa */
export const GET = apiRoute<{ path: string[] }>(async (_request, { path }) => {
  try {
    const { buffer, contentType } = await readUpload(path);
    return new NextResponse(buffer, {
      headers: {
        "content-type": contentType,
        "cache-control": `public, max-age=${ONE_DAY_IN_SECONDS}, immutable`,
      },
    });
  } catch (error) {
    if (error instanceof UploadValidationError) throw error;
    if (isNotFoundError(error)) throw notFound("File not found.");

    logger.error("Unexpected error reading upload:", error, { path: path.join("/") });
    throw error;
  }
});
