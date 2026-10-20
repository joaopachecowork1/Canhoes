import type { EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";

/** Comprimento mínimo do título de um item da wishlist. */
export const MIN_WISHLIST_TITLE_LENGTH = 2;

/** Os itens de cada membro, do atualizado mais recentemente para o mais antigo. */
export function groupWishlistItemsByUser(items: EventWishlistItemDto[]) {
  const wishlistByUser = new Map<string, EventWishlistItemDto[]>();

  for (const wishlistItem of items) {
    const itemsForUser = wishlistByUser.get(wishlistItem.userId) ?? [];
    itemsForUser.push(wishlistItem);
    wishlistByUser.set(wishlistItem.userId, itemsForUser);
  }

  for (const itemsForUser of wishlistByUser.values()) {
    itemsForUser.sort((leftItem, rightItem) =>
      (rightItem.updatedAtUtc || "").localeCompare(leftItem.updatedAtUtc || ""),
    );
  }

  return wishlistByUser;
}

/** O separador a mostrar: o escolhido se ainda existir, senão a tua lista, senão o primeiro. */
export function pickSelectedMemberId(pickedId: string | null, members: PublicUserDto[], userId: string | undefined) {
  const hasMember = (id: string | null | undefined) => Boolean(id) && members.some((member) => member.id === id);
  if (hasMember(pickedId)) return pickedId;
  if (hasMember(userId)) return userId ?? null;
  return members[0]?.id ?? null;
}

/** O nome a mostrar de um membro: nome de apresentação, senão email, senão id. */
export function getMemberLabel(member: PublicUserDto) {
  return member.displayName || member.email || member.id;
}
