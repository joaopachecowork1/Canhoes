import type { EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";

export const MIN_WISHLIST_TITLE_LENGTH = 2;

/** Each member's items, most recently updated first. */
export function groupWishlistItemsByUser(items: EventWishlistItemDto[]) {
  const wishlistByUser = new Map<string, EventWishlistItemDto[]>();

  for (const wishlistItem of items) {
    const itemsForUser = wishlistByUser.get(wishlistItem.userId) ?? [];
    itemsForUser.push(wishlistItem);
    wishlistByUser.set(wishlistItem.userId, itemsForUser);
  }

  for (const itemsForUser of wishlistByUser.values()) {
    itemsForUser.sort((leftItem, rightItem) => (rightItem.updatedAtUtc || "").localeCompare(leftItem.updatedAtUtc || ""));
  }

  return wishlistByUser;
}

/** The tab to show: the one picked if it still exists, else your own list, else the first. */
export function pickSelectedMemberId(pickedId: string | null, members: PublicUserDto[], userId: string | undefined) {
  const hasMember = (id: string | null | undefined) => Boolean(id) && members.some((member) => member.id === id);
  if (hasMember(pickedId)) return pickedId;
  if (hasMember(userId)) return userId ?? null;
  return members[0]?.id ?? null;
}

export function getMemberLabel(member: PublicUserDto) {
  return member.displayName || member.email || member.id;
}
