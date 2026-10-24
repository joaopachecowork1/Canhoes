import type { Nominee, ProposalStatus } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import type { AdminNomineeDto, AdminNomineesPagedDto } from "@/lib/api/types";
import { loadUsersById } from "@/lib/usersById";

/*
 * Moderação das nomeações (e dos cromos, que são nomeações com `submissionKind: "stickers"`).
 * Só as nomeações aprovadas chegam às páginas dos membros e ao quadro de votação.
 */

/** Uma alteração do admin: mudar de categoria ou decidir (aprovar/rejeitar). */
type NominationChange = { categoryId: string | null } | { status: "approved" | "rejected" };
/** Quem submeteu a nomeação, se ainda existir. */
type Submitter = { displayName: string | null; email: string } | null | undefined;

/** Converte uma nomeação no DTO de admin, com o nome de quem a submeteu. */
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

/** Aplica uma alteração do admin a uma nomeação deste evento; null quando não existe aqui. */
async function updateNomination(
  eventId: string,
  nomineeId: string,
  change: NominationChange,
): Promise<AdminNomineeDto | null> {
  // Confirma que a nomeação é deste evento antes de a alterar.
  const nominee = await prisma.nominee.findFirst({ where: { id: nomineeId, eventId }, select: { id: true } });
  if (!nominee) return null;

  const updated = await prisma.nominee.update({ where: { id: nomineeId }, data: change });
  const submitter = await prisma.user.findUnique({
    where: { id: updated.submittedByUserId },
    select: { displayName: true, email: true },
  });
  return toAdminNomineeDto(updated, submitter);
}

/** Move uma nomeação para outra categoria, ou para fora de qualquer categoria com `null`. */
export function setNominationCategory(eventId: string, nomineeId: string, categoryId?: string | null) {
  return updateNomination(eventId, nomineeId, { categoryId: categoryId ?? null });
}

/** Aprova uma nomeação: passa a aparecer aos membros e no quadro de votação da sua categoria. */
export function approveNomination(eventId: string, nomineeId: string) {
  return updateNomination(eventId, nomineeId, { status: "approved" });
}

/** Rejeita uma nomeação: deixa de aparecer aos membros e no quadro de votação. */
export function rejectNomination(eventId: string, nomineeId: string) {
  return updateNomination(eventId, nomineeId, { status: "rejected" });
}

/** Nomeações do evento para a lista de moderação, das mais recentes para as mais antigas, com o nome de quem as submeteu. */
export async function getAdminNominationsPaged(
  eventId: string,
  status?: string | null,
  skip = 0,
  take = 50,
): Promise<AdminNomineesPagedDto> {
  // Sem estado válido, lista todas.
  const parsedStatus = ProposalStatusSchema.safeParse(status);
  const where = parsedStatus.success ? { eventId, status: parsedStatus.data as ProposalStatus } : { eventId };
  const [total, nominees] = await Promise.all([
    prisma.nominee.count({ where }),
    prisma.nominee.findMany({ where, orderBy: { createdAtUtc: "desc" }, skip, take }),
  ]);

  // Nomes de quem submeteu, numa só query.
  const submitterById = await loadUsersById(
    nominees.map((nominee) => nominee.submittedByUserId),
    (where) => prisma.user.findMany({ where, select: { id: true, displayName: true, email: true } }),
  );

  return {
    total,
    nominations: nominees.map((nominee) => toAdminNomineeDto(nominee, submitterById.get(nominee.submittedByUserId))),
    skip,
    take,
    hasMore: skip + take < total,
  };
}
