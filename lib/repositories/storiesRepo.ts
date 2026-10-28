import { canhoesFetch } from "@/lib/api/canhoesClient";
import type * as T from "@/lib/api/types";

/** Chamadas das stories: listar as ativas, publicar uma imagem e apagar. */
export const storiesRepo = {
  list: (eventId: string) => canhoesFetch<T.StoryAuthorDto[]>(`/v1/events/${eventId}/stories`),

  publish: (eventId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return canhoesFetch<{ id: string; createdAtUtc: string; expiresAtUtc: string }>(`/v1/events/${eventId}/stories`, {
      method: "POST",
      body: formData,
    });
  },

  remove: (eventId: string, storyId: string) =>
    canhoesFetch<void>(`/v1/events/${eventId}/stories/${storyId}`, { method: "DELETE" }),
};
