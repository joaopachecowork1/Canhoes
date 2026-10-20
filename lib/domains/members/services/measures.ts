import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import type { GalaMeasureDto, MeasureProposalDto } from "@/lib/api/types";

/* Gala measures: the approved list and proposals members make. Route guards decide who may call each one. */

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
  text: string,
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
    status: ProposalStatusSchema.parse(proposal.status),
    createdAtUtc: proposal.createdAtUtc.toISOString(),
  };
}
