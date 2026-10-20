import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import { deleteUpload, saveUpload } from "@/lib/storage/localStorage";
import type { MyNominationDto, NomineeDto } from "@/lib/api/types";

/* Nominations and stickers: what a member submitted, what is approved, and nominee images. Route guards decide who may call each one. */

type NomineeRow = {
  id: string;
  categoryId: string | null;
  title: string;
  imageUrl: string | null;
  status: string;
  createdAtUtc: Date;
};

function toNomineeDto(nominee: NomineeRow): NomineeDto {
  return {
    id: nominee.id,
    categoryId: nominee.categoryId,
    title: nominee.title,
    imageUrl: nominee.imageUrl,
    status: ProposalStatusSchema.parse(nominee.status),
    createdAtUtc: nominee.createdAtUtc.toISOString(),
  };
}

/** The user's nominations in the event, the newest per category (stickers are not nominations). */
export async function getMyNominations(eventId: string, userId: string): Promise<MyNominationDto[]> {
  const nominees = await prisma.nominee.findMany({
    where: { eventId, submittedByUserId: userId, submissionKind: "nominees" },
    orderBy: { createdAtUtc: "desc" },
    distinct: ["categoryId"],
  });

  return nominees.map((nominee) => ({
    categoryId: nominee.categoryId,
    status: ProposalStatusSchema.parse(nominee.status),
    nomineeId: nominee.id,
    nomineeTitle: nominee.title,
  }));
}

/** Approved nominations of the event, newest first. */
export async function getApprovedNominees(eventId: string): Promise<NomineeDto[]> {
  const nominees = await prisma.nominee.findMany({
    where: { eventId, status: "approved" },
    orderBy: { createdAtUtc: "desc" },
  });

  return nominees.map(toNomineeDto);
}

/** Records a nomination (or a sticker, with `kind: "stickers"`) as `pending`, for the admin to moderate. */
export async function createNomination(
  eventId: string,
  userId: string,
  data: { title: string; categoryId?: string | null; kind?: string | null; targetUserId?: string | null },
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

  return toNomineeDto(nominee);
}

/** Stores a new image for a nominee its submitter (or an admin) owns; the previous upload is removed. */
export async function replaceNomineeImage(
  eventId: string,
  nomineeId: string,
  user: { id: string; isAdmin: boolean },
  file: File,
): Promise<NomineeDto | null> {
  const nominee = await prisma.nominee.findFirst({ where: { id: nomineeId, eventId } });
  if (!nominee || (nominee.submittedByUserId !== user.id && !user.isAdmin)) return null;

  const upload = await saveUpload(file, ["canhoes", "nominees"]);
  const updated = await prisma.nominee.update({
    where: { id: nomineeId },
    data: { imageUrl: upload.url },
  });
  if (nominee.imageUrl) await deleteUpload(nominee.imageUrl);

  return toNomineeDto(updated);
}
