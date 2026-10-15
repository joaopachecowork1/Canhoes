import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/storage/localStorage";
import type {
  PublicUserDto,
  GalaMeasureDto,
  MeasureProposalDto,
  MyNominationStatusDto,
  NomineeDto,
  EventWishlistItemDto,
  PagedResult,
} from "@/lib/api/types";

/*
 * What members do outside the feed and the voting: see who is in the event, keep a wishlist, nominate
 * candidates and stickers, and propose gala measures. Route guards decide who may call each one.
 */

/** Members of the event, admins first and then by name. `isAdmin` here is the event role, not the account flag. */
export async function getMembers(eventId: string): Promise<PublicUserDto[]> {
  const members = await prisma.eventMember.findMany({
    where: { eventId },
    orderBy: { role: "desc" },
  });

  const userIds = [...new Set(members.map((m) => m.userId))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, displayName: true, isAdmin: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const result = members
    .map((m) => {
      const u = userMap.get(m.userId);
      return u ? { id: u.id, email: u.email, displayName: u.displayName, isAdmin: m.role === "admin" } : null;
    })
    .filter((x): x is PublicUserDto => x !== null)
    .sort((a, b) => {
      const roleCmp = (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0);
      if (roleCmp !== 0) return roleCmp;
      return (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email);
    });

  return result;
}

/** Official gala measures of the event, newest first. */
export async function getMeasures(eventId: string): Promise<GalaMeasureDto[]> {
  const measures = await prisma.galaMeasure.findMany({
    where: { eventId },
    orderBy: { createdAtUtc: "desc" },
  });

  return measures.map((m) => ({
    id: m.id,
    text: m.text,
    isActive: m.isActive,
    createdAtUtc: m.createdAtUtc.toISOString(),
  }));
}

/** Records a measure proposal as `pending`, for the admin to moderate. */
export async function createMeasureProposal(
  eventId: string,
  userId: string,
  text: string
): Promise<MeasureProposalDto> {
  const proposal = await prisma.measureProposal.create({
    data: {
      eventId,
      proposedByUserId: userId,
      text,
      status: "pending",
    },
  });

  return {
    id: proposal.id,
    text: proposal.text,
    status: proposal.status as "pending" | "approved" | "rejected",
    createdAtUtc: proposal.createdAtUtc.toISOString(),
  };
}

/** The user's most recent nomination in the event and its status, for the nominations page. */
export async function getMyNominationStatus(
  eventId: string,
  userId: string
): Promise<MyNominationStatusDto> {
  const nominee = await prisma.nominee.findFirst({
    where: { eventId, submittedByUserId: userId },
    orderBy: { createdAtUtc: "desc" },
  });

  if (!nominee) {
    return { hasNomination: false, categoryId: null, status: null, nomineeId: null, nomineeTitle: null };
  }

  return {
    hasNomination: true,
    categoryId: nominee.categoryId,
    status: nominee.status as "pending" | "approved" | "rejected",
    nomineeId: nominee.id,
    nomineeTitle: nominee.title,
  };
}

/** Approved nominations of the event, newest first. */
export async function getApprovedNominees(eventId: string): Promise<NomineeDto[]> {
  const nominees = await prisma.nominee.findMany({
    where: { eventId, status: "approved" },
    orderBy: { createdAtUtc: "desc" },
  });

  return nominees.map((n) => ({
    id: n.id,
    categoryId: n.categoryId,
    title: n.title,
    imageUrl: n.imageUrl,
    status: n.status as "pending" | "approved" | "rejected",
    createdAtUtc: n.createdAtUtc.toISOString(),
  }));
}

/** Records a nomination (or a sticker, with `kind: "stickers"`) as `pending`, for the admin to moderate. */
export async function createNomination(
  eventId: string,
  userId: string,
  data: { title: string; categoryId?: string | null; kind?: string | null; targetUserId?: string | null }
): Promise<NomineeDto> {
  const nominee = await prisma.nominee.create({
    data: {
      eventId,
      submittedByUserId: userId,
      title: data.title.trim(),
      categoryId: data.categoryId ?? null,
      submissionKind: data.kind?.trim().toLowerCase() === "stickers" ? "stickers" : "nominees",
      imageUrl: null,
      status: "pending",
    },
  });

  return {
    id: nominee.id,
    categoryId: nominee.categoryId,
    title: nominee.title,
    imageUrl: nominee.imageUrl,
    status: nominee.status as "pending" | "approved" | "rejected",
    createdAtUtc: nominee.createdAtUtc.toISOString(),
  };
}

/** Stores a new image for a nominee its submitter (or an admin) owns; the previous upload is removed. */
export async function replaceNomineeImage(
  eventId: string,
  nomineeId: string,
  user: { id: string; isAdmin: boolean },
  file: File
): Promise<NomineeDto | null> {
  const nominee = await prisma.nominee.findFirst({ where: { id: nomineeId, eventId } });
  if (!nominee || (nominee.submittedByUserId !== user.id && !user.isAdmin)) return null;

  const upload = await saveUpload(file, ["canhoes", "nominees"]);
  const updated = await prisma.nominee.update({
    where: { id: nomineeId },
    data: { imageUrl: upload.url },
  });
  if (nominee.imageUrl) await deleteUpload(nominee.imageUrl);

  return {
    id: updated.id,
    categoryId: updated.categoryId,
    title: updated.title,
    imageUrl: updated.imageUrl,
    status: updated.status as "pending" | "approved" | "rejected",
    createdAtUtc: updated.createdAtUtc.toISOString(),
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

  return {
    id: updated.id,
    userId: updated.userId,
    eventId: updated.eventId,
    title: updated.title,
    url: updated.url,
    notes: updated.notes,
    imageUrl: updated.imageUrl,
    updatedAtUtc: updated.updatedAtUtc.toISOString(),
  };
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

  const mappedItems = items.map((item) => ({
    id: item.id,
    userId: item.userId,
    eventId: item.eventId,
    title: item.title,
    url: item.url,
    notes: item.notes,
    imageUrl: item.imageUrl,
    updatedAtUtc: item.updatedAtUtc.toISOString(),
  }));

  return {
    items: mappedItems,
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
