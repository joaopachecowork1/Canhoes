import type { Nominee } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import type {
  AdminNomineeDto,
  AdminNomineesPagedDto,
} from "@/lib/api/types";

/*
 * Moderation of nominations (and stickers, which are nominations with `submissionKind: "stickers"`).
 * Only approved nominations reach the members' pages and the voting board.
 */

type NominationChange = { categoryId: string | null } | { status: "approved" | "rejected" };
type Submitter = { displayName: string | null; email: string } | null | undefined;

function toAdminNomineeDto(nominee: Nominee, submitter: Submitter): AdminNomineeDto {
  return {
    id: nominee.id,
    categoryId: nominee.categoryId,
    title: nominee.title,
    imageUrl: nominee.imageUrl,
    status: ProposalStatusSchema.parse(nominee.status),
    createdAtUtc: nominee.createdAtUtc.toISOString(),
    submittedByName: submitter?.displayName ?? submitter?.email ?? "Unknown",
  };
}

/** Applies one admin change to a nomination of this event; null when it does not exist here. */
async function updateNomination(
  eventId: string,
  nomineeId: string,
  change: NominationChange
): Promise<AdminNomineeDto | null> {
  const nominee = await prisma.nominee.findFirst({ where: { id: nomineeId, eventId }, select: { id: true } });
  if (!nominee) return null;

  const updated = await prisma.nominee.update({ where: { id: nomineeId }, data: change });
  const submitter = await prisma.user.findUnique({
    where: { id: updated.submittedByUserId },
    select: { displayName: true, email: true },
  });
  return toAdminNomineeDto(updated, submitter);
}

/** Moves a nomination to another category, or out of any category with `null`. */
export function setNominationCategory(eventId: string, nomineeId: string, categoryId?: string | null) {
  return updateNomination(eventId, nomineeId, { categoryId: categoryId ?? null });
}

/** Approves a nomination: it shows up for members and on its category's voting board. */
export function approveNomination(eventId: string, nomineeId: string) {
  return updateNomination(eventId, nomineeId, { status: "approved" });
}

/** Rejects a nomination: it disappears for members and from the voting board. */
export function rejectNomination(eventId: string, nomineeId: string) {
  return updateNomination(eventId, nomineeId, { status: "rejected" });
}

/** Nominations of the event for the moderation list, newest first, with the submitter's name. */
export async function getAdminNominationsPaged(
  eventId: string,
  status?: string | null,
  skip = 0,
  take = 50
): Promise<AdminNomineesPagedDto> {
  const where = status ? { eventId, status } : { eventId };
  const [total, nominees] = await Promise.all([
    prisma.nominee.count({ where }),
    prisma.nominee.findMany({ where, orderBy: { createdAtUtc: "desc" }, skip, take }),
  ]);

  const submitterIds = [...new Set(nominees.map((nominee) => nominee.submittedByUserId))];
  const submitters = submitterIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, displayName: true, email: true } })
    : [];
  const submitterById = new Map(submitters.map((submitter) => [submitter.id, submitter]));

  return {
    total,
    nominations: nominees.map((nominee) => toAdminNomineeDto(nominee, submitterById.get(nominee.submittedByUserId))),
    skip,
    take,
    hasMore: skip + take < total,
  };
}
