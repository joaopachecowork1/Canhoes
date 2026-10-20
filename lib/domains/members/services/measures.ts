import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import type { GalaMeasureDto, MeasureProposalDto } from "@/lib/api/types";

/* Medidas da gala: a lista oficial e as propostas dos membros. As guardas das rotas decidem quem pode chamar cada função. */

/** Medidas oficiais da gala do evento, das mais recentes para as mais antigas. */
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

/** Regista uma proposta de medida como `pending`, para o admin moderar. */
export async function createMeasureProposal(
  eventId: string,
  userId: string,
  text: string,
): Promise<MeasureProposalDto> {
  // Nasce sempre pendente: só o admin a aprova.
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
