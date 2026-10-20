import { NextResponse } from "next/server";

import { notFound } from "@/lib/api/httpError";
import { apiRoute } from "@/lib/api/route";
import { readUpload, UploadValidationError } from "@/lib/storage/localStorage";

// Cache de um dia no browser.
const ONE_DAY_IN_SECONDS = 86_400;

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
    // Caminho inválido mantém o seu erro; qualquer outra falha é um 404.
    if (error instanceof UploadValidationError) throw error;
    throw notFound("File not found.");
  }
});
