import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/storage/localStorage";
import type { EventWishlistItemDto, PagedResult } from "@/lib/api/types";

/* Listas de desejos dos membros, partilhadas com o grupo todo. As guardas das rotas decidem quem pode chamar cada função. */

/** Os campos de um item da lista de desejos que o DTO precisa. */
type WishlistItemRow = {
  id: string;
  userId: string;
  eventId: string;
  title: string;
  url: string | null;
  notes: string | null;
  imageUrl: string | null;
  updatedAtUtc: Date;
};

/** Converte um item da BD no DTO da API. */
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

/** Guarda uma nova imagem para um item do próprio dono (ou de um admin); o upload anterior é apagado. */
export async function replaceWishlistImage(
  eventId: string,
  itemId: string,
  user: { id: string; isAdmin: boolean },
  file: File,
): Promise<EventWishlistItemDto | null> {
  // Só o dono ou um admin pode mudar a imagem; devolve null se não existir ou não for permitido.
  const item = await prisma.wishlistItem.findFirst({ where: { id: itemId, eventId } });
  if (!item || (item.userId !== user.id && !user.isAdmin)) return null;

  const upload = await saveUpload(file, ["canhoes", "wishlist"]);
  const updated = await prisma.wishlistItem.update({
    where: { id: itemId },
    data: { imageUrl: upload.url },
  });
  // Só apaga a imagem antiga depois de a nova estar gravada.
  if (item.imageUrl) await deleteUpload(item.imageUrl);

  return toWishlistItemDto(updated);
}

/** Todos os itens de desejos do evento, paginados: as listas são partilhadas com o grupo todo. */
export async function getWishlistItems(
  eventId: string,
  skip = 0,
  take = 50,
): Promise<PagedResult<EventWishlistItemDto>> {
  // Página e total em paralelo, para saber se há mais.
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

/** Acrescenta um item à lista de desejos do utilizador neste evento. */
export async function createWishlistItem(
  eventId: string,
  userId: string,
  data: { title: string; url?: string | null; notes?: string | null },
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

/** Apaga um item de desejos deste evento; só o dono ou um admin pode. Devolve false se não for permitido ou não existir. */
export async function deleteWishlistItem(
  eventId: string,
  itemId: string,
  userId: string,
  isAdmin: boolean,
): Promise<boolean> {
  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, eventId },
  });

  if (!item) return false;
  if (item.userId !== userId && !isAdmin) return false;

  await prisma.wishlistItem.delete({ where: { id: itemId } });
  return true;
}
