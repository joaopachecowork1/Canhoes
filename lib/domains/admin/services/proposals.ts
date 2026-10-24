import type { CategoryProposal, MeasureProposal, Prisma, ProposalStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import type { PagedResult, CategoryProposalDto, MeasureProposalDto } from "@/lib/api/types";

/*
 * Moderação do que os membros propõem: novas categorias dos prémios e medidas da gala. Cada proposta
 * começa `pending`; o admin aprova, rejeita, edita ou apaga.
 */

/** Só a passagem para `approved` cria a categoria ou a medida, por isso aprovar duas vezes cria uma só. */
function isNewlyApproved(currentStatus: string, nextStatus: string | undefined) {
  return nextStatus === "approved" && currentStatus !== "approved";
}

function toCategoryProposalDto(proposal: CategoryProposal): CategoryProposalDto {
  return {
    id: proposal.id,
    name: proposal.name,
    kind: proposal.kind,
    description: proposal.description,
    status: ProposalStatusSchema.parse(proposal.status),
    createdAtUtc: proposal.createdAtUtc.toISOString(),
  };
}

/** Propostas de categorias do evento, das mais recentes para as mais antigas, com filtro opcional por estado. */
export async function getCategoryProposals(
  eventId: string,
  status?: string | null,
  skip = 0,
  take = 50,
): Promise<PagedResult<CategoryProposalDto>> {
  const where: Record<string, unknown> = { eventId };
  if (status) where.status = status;

  // O id desempata propostas criadas no mesmo instante, para a paginação ser estável.
  const [items, total] = await Promise.all([
    prisma.categoryProposal.findMany({
      where,
      orderBy: [{ createdAtUtc: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.categoryProposal.count({ where }),
  ]);

  return {
    items: items.map(toCategoryProposalDto),
    total,
    skip,
    take,
    hasMore: skip + take < total,
  };
}

function buildCategoryProposalUpdateData(data: { name?: string; description?: string | null; status?: string }): {
  name?: string;
  description?: string | null;
  status?: ProposalStatus;
} {
  const updateData: { name?: string; description?: string | null; status?: ProposalStatus } = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() ?? null;
  if (data.status !== undefined) updateData.status = ProposalStatusSchema.parse(data.status);
  return updateData;
}

async function createCategoryFromProposal(
  tx: Prisma.TransactionClient,
  eventId: string,
  proposal: CategoryProposal,
  data: { name?: string; description?: string | null },
) {
  const maxSort = await tx.awardCategory.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });
  await tx.awardCategory.create({
    data: {
      eventId,
      name: (data.name ?? proposal.name).trim(),
      description: (data.description ?? proposal.description)?.trim() ?? null,
      kind: proposal.kind,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });
}

/**
 * Edita uma proposta de categoria ou muda o seu estado. Aprová-la cria a categoria dos prémios com o
 * nome, tipo e descrição da proposta (possivelmente editados). Transacional.
 */
export async function updateCategoryProposal(
  eventId: string,
  proposalId: string,
  data: { name?: string; description?: string | null; status?: string },
): Promise<CategoryProposalDto | null> {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.categoryProposal.findFirst({ where: { id: proposalId, eventId } });
    if (!proposal) return null;

    if (isNewlyApproved(proposal.status, data.status)) {
      await createCategoryFromProposal(tx, eventId, proposal, data);
    }

    const updated = await tx.categoryProposal.update({
      where: { id: proposalId },
      data: buildCategoryProposalUpdateData(data),
    });

    return toCategoryProposalDto(updated);
  });
}

/** Apaga uma proposta de categoria deste evento; false quando não existe aqui. */
export async function deleteCategoryProposal(eventId: string, proposalId: string): Promise<boolean> {
  const proposal = await prisma.categoryProposal.findFirst({
    where: { id: proposalId, eventId },
    select: { id: true },
  });
  if (!proposal) return false;
  await prisma.categoryProposal.delete({ where: { id: proposalId } });
  return true;
}

// ─────────────── PROPOSTAS DE MEDIDAS ───────────────

function toMeasureProposalDto(proposal: MeasureProposal): MeasureProposalDto {
  return {
    id: proposal.id,
    text: proposal.text,
    status: ProposalStatusSchema.parse(proposal.status),
    createdAtUtc: proposal.createdAtUtc.toISOString(),
  };
}

function buildMeasureProposalUpdateData(data: { text?: string; status?: string }): {
  text?: string;
  status?: ProposalStatus;
} {
  const updateData: { text?: string; status?: ProposalStatus } = {};
  if (data.text !== undefined) updateData.text = data.text.trim();
  if (data.status !== undefined) updateData.status = ProposalStatusSchema.parse(data.status);
  return updateData;
}

/** Propostas de medidas do evento, das mais recentes para as mais antigas, com filtro opcional por estado. */
export async function getMeasureProposals(
  eventId: string,
  status?: string | null,
  skip = 0,
  take = 50,
): Promise<PagedResult<MeasureProposalDto>> {
  const where: Record<string, unknown> = { eventId };
  if (status) where.status = status;

  // O id desempata propostas criadas no mesmo instante, para a paginação ser estável.
  const [items, total] = await Promise.all([
    prisma.measureProposal.findMany({
      where,
      orderBy: [{ createdAtUtc: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.measureProposal.count({ where }),
  ]);

  return {
    items: items.map(toMeasureProposalDto),
    total,
    skip,
    take,
    hasMore: skip + take < total,
  };
}

/** Edita uma proposta de medida ou muda o seu estado. Aprová-la acrescenta o texto (possivelmente editado) como medida ativa da gala. */
export async function updateMeasureProposal(
  eventId: string,
  proposalId: string,
  data: { text?: string; status?: string },
): Promise<MeasureProposalDto | null> {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.measureProposal.findFirst({ where: { id: proposalId, eventId } });
    if (!proposal) return null;

    if (isNewlyApproved(proposal.status, data.status)) {
      const text = (data.text ?? proposal.text).trim();
      await tx.galaMeasure.create({ data: { eventId, text, isActive: true } });
    }

    const updated = await tx.measureProposal.update({
      where: { id: proposalId },
      data: buildMeasureProposalUpdateData(data),
    });

    return toMeasureProposalDto(updated);
  });
}

/** Apaga uma proposta de medida deste evento; false quando não existe aqui. */
export async function deleteMeasureProposal(eventId: string, proposalId: string): Promise<boolean> {
  const proposal = await prisma.measureProposal.findFirst({
    where: { id: proposalId, eventId },
    select: { id: true },
  });
  if (!proposal) return false;
  await prisma.measureProposal.delete({ where: { id: proposalId } });
  return true;
}
