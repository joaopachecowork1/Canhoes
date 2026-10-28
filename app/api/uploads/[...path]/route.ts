import { NextResponse } from "next/server";

import { notFound } from "@/lib/api/httpError";
import { apiRoute } from "@/lib/api/route";
import { logger } from "@/lib/logger";
import { isMissingFileError, readUpload, UploadValidationError } from "@/lib/storage/localStorage";

// Cache de um dia no browser.
const ONE_DAY_IN_SECONDS = 86_400;

/** GET /uploads/:path: serve um ficheiro carregado, com cache longa */
export const GET = apiRoute<{ path: string[] }>(async (_request, { path }) => {
  // As stories só se veem pela rota autenticada do evento; aqui o URL seria público e ficaria em cache.
  // Sem distinguir maiúsculas, porque um disco local que as ignore resolveria `Stories/…` para a mesma pasta.
  if (path[0]?.toLowerCase() === "stories") throw notFound("File not found.");

  try {
    const { buffer, contentType } = await readUpload(path);
    return new NextResponse(buffer, {
      headers: {
        "content-type": contentType,
        "cache-control": `public, max-age=${ONE_DAY_IN_SECONDS}, immutable`,
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "cross-origin-resource-policy": "same-origin",
      },
    });
  } catch (error) {
    if (error instanceof UploadValidationError) throw error;
    if (isMissingFileError(error)) throw notFound("File not found.");

    logger.error("Unexpected error reading upload:", error, { path: path.join("/") });
    throw error;
  }
});
