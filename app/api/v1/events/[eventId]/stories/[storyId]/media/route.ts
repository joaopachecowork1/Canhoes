import { NextResponse } from "next/server";

import { requireModule, requireUser } from "@/lib/api/guards";
import { apiRoute } from "@/lib/api/route";
import { readStoryMedia } from "@/lib/domains/stories/services/storyViewing";

/** GET /v1/events/:eventId/stories/:storyId/media: a imagem de uma story, só para membros e sem cache */
export const GET = apiRoute<{ eventId: string; storyId: string }>(async (_request, { eventId, storyId }) => {
  // Exige sessão iniciada e a área do mural aberta ao membro.
  const user = await requireUser();
  await requireModule(eventId, user, "feed");

  const { buffer, contentType } = await readStoryMedia(eventId, storyId);
  return new NextResponse(buffer, {
    headers: {
      "content-type": contentType,
      // Uma story expira: nada de cache partilhada nem do browser, para a imagem não sobreviver às 24 horas.
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
    },
  });
});
