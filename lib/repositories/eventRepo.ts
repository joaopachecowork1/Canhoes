import { canhoesFetch } from "@/lib/api/canhoesClient";
import type * as T from "@/lib/api/types";

export const eventRepo = {
  getActiveContext: () => canhoesFetch<T.EventActiveContextDto>("/v1/events/active/context"),

  getEventOverview: (eventId: string) => canhoesFetch<T.EventOverviewDto>(`/v1/events/${eventId}/overview`),

  getMembers: (eventId: string) => canhoesFetch<T.PublicUserDto[]>(`/v1/events/${eventId}/members`),

  getWishlist: (eventId: string, skip = 0, take = 50) =>
    canhoesFetch<T.PagedResult<T.EventWishlistItemDto>>(`/v1/events/${eventId}/wishlist?skip=${skip}&take=${take}`),

  createWishlistItem: (eventId: string, payload: { title: string; url: string | null; notes: string | null }) =>
    canhoesFetch<T.EventWishlistItemDto>(`/v1/events/${eventId}/wishlist`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  uploadWishlistImage: (eventId: string, itemId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return canhoesFetch<void>(`/v1/events/${eventId}/wishlist/${itemId}/image`, {
      method: "POST",
      body: formData,
      canhoes: { skipDeduplication: true },
    });
  },

  deleteWishlistItem: (eventId: string, itemId: string) =>
    canhoesFetch<void>(`/v1/events/${eventId}/wishlist/${itemId}`, { method: "DELETE" }),

  getSecretSantaOverview: (eventId: string) =>
    canhoesFetch<T.EventSecretSantaOverviewDto>(`/v1/events/${eventId}/secret-santa/overview`),
};
