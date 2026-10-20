import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import type { PagedResult, CategoryProposalDto, MeasureProposalDto } from "@/lib/api/types";
import { createCategory } from "./categories";

/*
 * Moderação do que os membros propõem: novas categorias dos prémios e medidas da gala. Cada proposta
 * começa `pending`; o admin aprova, rejeita, edita ou apaga.
 */

/** Só a passagem para `approved` cria a categoria ou a medida, por isso aprovar duas vezes cria uma só. */
function isNewlyApproved(currentStatus: string, nextStatus: string | undefined) {
  return nextStatus === "approved" && currentStatus !== "approved";
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
    items: items.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      description: p.description,
      status: ProposalStatusSchema.parse(p.status),
      createdAtUtc: p.createdAtUtc.toISOString(),
    })),
    total,
    skip,
    take,
    hasMore: skip + take < total,
  };
}

/**
 * Edita uma proposta de categoria ou muda o seu estado. Aprová-la cria a categoria dos prémios com o
 * nome, tipo e descrição da proposta (possivelmente editados).
 */
export async function updateCategoryProposal(
  eventId: string,
  proposalId: string,
  data: { name?: string; description?: string | null; status?: string },
): Promise<CategoryProposalDto | null> {
  const proposal = await prisma.categoryProposal.findFirst({ where: { id: proposalId, eventId } });
  if (!proposal) return null;

  // Só os campos enviados são alterados.
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() ?? null;
  if (data.status !== undefined) updateData.status = data.status;

  // Ao aprovar pela primeira vez, a proposta passa a ser uma categoria.
  if (isNewlyApproved(proposal.status, data.status)) {
    await createCategory(eventId, {
      name: data.name ?? proposal.name,
      kind: proposal.kind,
      description: data.description ?? proposal.description,
    });
  }

  const updated = await prisma.categoryProposal.update({
    where: { id: proposalId },
    data: updateData,
  });

  return {
    id: updated.id,
    name: updated.name,
    kind: updated.kind,
    description: updated.description,
    status: ProposalStatusSchema.parse(updated.status),
    createdAtUtc: updated.createdAtUtc.toISOString(),
  };
}

/** Apaga uma proposta de categoria deste evento; false quando não existe aqui. */
export async function deleteCategoryProposal(eventId: string, proposalId: string): Promise<boolean> {
  const proposal = await prisma.categoryProposal.findFirst({ where: { id: proposalId, eventId } });
  if (!proposal) return false;
  await prisma.categoryProposal.delete({ where: { id: proposalId } });
  return true;
}

// ─────────────── PROPOSTAS DE MEDIDAS ───────────────

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
    items: items.map((p) => ({
      id: p.id,
      text: p.text,
      status: ProposalStatusSchema.parse(p.status),
      createdAtUtc: p.createdAtUtc.toISOString(),
    })),
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
  const proposal = await prisma.measureProposal.findFirst({ where: { id: proposalId, eventId } });
  if (!proposal) return null;

  // Só os campos enviados são alterados.
  const updateData: Record<string, unknown> = {};
  if (data.text !== undefined) updateData.text = data.text.trim();
  if (data.status !== undefined) updateData.status = data.status;

  // Na mesma transação: atualizar a proposta e, se acabou de ser aprovada, criar a medida.
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.measureProposal.update({ where: { id: proposalId }, data: updateData });
    if (isNewlyApproved(proposal.status, data.status)) {
      await tx.galaMeasure.create({ data: { eventId, text: saved.text, isActive: true } });
    }
    return saved;
  });

  return {
    id: updated.id,
    text: updated.text,
    status: ProposalStatusSchema.parse(updated.status),
    createdAtUtc: updated.createdAtUtc.toISOString(),
  };
}

/** Apaga uma proposta de medida deste evento; false quando não existe aqui. */
export async function deleteMeasureProposal(eventId: string, proposalId: string): Promise<boolean> {
  const proposal = await prisma.measureProposal.findFirst({ where: { id: proposalId, eventId } });
  if (!proposal) return false;
  await prisma.measureProposal.delete({ where: { id: proposalId } });
  return true;
}
