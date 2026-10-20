import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/storage/localStorage";
import type { EventWishlistItemDto, PagedResult } from "@/lib/api/types";

/* Members' wishlists, shared with the whole group. Route guards decide who may call each one. */

type WishlistItemRow = { id: string; userId: string; eventId: string; title: string; url: string | null; notes: string | null; imageUrl: string | null; updatedAtUtc: Date };

function toWishlistItemDto(item: WishlistItemRow): EventWishlistItemDto {
  return {
    id: item.id,
    userId: item.userId,
    eventId: item.eventId,
    title: item.title,
    url: item.url,
    notes: item.notes,
    imageUrl: item.imageUrl,
    updatedAtUtc: item.updatedAtUtc.toISOString(),
  };
}

/** Stores a new image for a wishlist item its owner (or an admin) owns; the previous upload is removed. */
export async function replaceWishlistImage(
  eventId: string,
  itemId: string,
  user: { id: string; isAdmin: boolean },
  file: File
): Promise<EventWishlistItemDto | null> {
  const item = await prisma.wishlistItem.findFirst({ where: { id: itemId, eventId } });
  if (!item || (item.userId !== user.id && !user.isAdmin)) return null;

  const upload = await saveUpload(file, ["canhoes", "wishlist"]);
  const updated = await prisma.wishlistItem.update({
    where: { id: itemId },
    data: { imageUrl: upload.url },
  });
  if (item.imageUrl) await deleteUpload(item.imageUrl);

  return toWishlistItemDto(updated);
}

/** Every wishlist item of the event: wishlists are shared with the whole group. */
export async function getWishlistItems(
  eventId: string,
  skip = 0,
  take = 50
): Promise<PagedResult<EventWishlistItemDto>> {
  const [items, total] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { eventId },
      orderBy: { createdAtUtc: "desc" },
      skip,
      take,
    }),
    prisma.wishlistItem.count({ where: { eventId } }),
  ]);

  return {
    items: items.map(toWishlistItemDto),
    total,
    skip,
    take,
    hasMore: skip + take < total,
  };
}

/** Adds an item to the user's wishlist in this event. */
export async function createWishlistItem(
  eventId: string,
  userId: string,
  data: { title: string; url?: string | null; notes?: string | null }
): Promise<EventWishlistItemDto> {
  const item = await prisma.wishlistItem.create({
    data: {
      eventId,
      userId,
      title: data.title.trim(),
      url: data.url?.trim() ?? null,
      notes: data.notes?.trim() ?? null,
    },
  });

  return toWishlistItemDto(item);
}

/** Deletes a wishlist item of this event; only its owner or an admin may. False when not allowed or not found. */
export async function deleteWishlistItem(
  eventId: string,
  itemId: string,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, eventId },
  });

  if (!item) return false;
  if (item.userId !== userId && !isAdmin) return false;

  await prisma.wishlistItem.delete({ where: { id: itemId } });
  return true;
}
