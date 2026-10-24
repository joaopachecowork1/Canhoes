import { HttpError } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";
import { CATEGORY_KIND } from "@/lib/categoryKind";
import { isVotingOpen } from "@/lib/domains/event/rules/eventRules";
import type {
  EventVotingBoardDto,
  EventVotingCategoryDto,
  EventVoteOptionDto,
  EventProposalDto,
} from "@/lib/api/types";
import { loadUsersById } from "@/lib/usersById";

/*
 * O lado dos membros nos prémios: o quadro de votação, votar e propor novas categorias.
 * Um voto só conta dentro das datas da fase de votação ativa (`isVotingOpen` em `eventRules.ts`).
 */

/** O voto registado: a categoria e a opção escolhida. */
type EventVoteDto = {
  categoryId: string;
  selectionId: string;
};

/** Campos mínimos de um membro e de um utilizador usados para montar as opções. */
type MemberRow = { userId: string; role: string };
type UserName = { displayName: string | null; email: string };

/** Opções de uma categoria de pessoas: os membros do evento que não são admins, por nome. */
function toMemberOptions(members: MemberRow[], users: Map<string, UserName>): EventVoteOptionDto[] {
  const labelOf = (userId: string) => users.get(userId)?.displayName ?? users.get(userId)?.email ?? "Unknown";
  return members
    .filter((member) => member.role !== "admin")
    .map((member) => ({ id: member.userId, label: labelOf(member.userId), imageUrl: null }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

/** Opções de uma categoria de nomeados: as suas nomeações aprovadas. */
function toNomineeOptions(
  nominees: { id: string; title: string; categoryId: string | null }[],
  categoryId: string,
): EventVoteOptionDto[] {
  return nominees
    .filter((nominee) => nominee.categoryId === categoryId)
    .map((nominee) => ({ id: nominee.id, label: nominee.title, imageUrl: null }));
}

/**
 * O quadro de votação: cada categoria ativa com as suas opções e a escolha atual do utilizador. As
 * categorias de nomeados oferecem as nomeações aprovadas; as de pessoas (`CATEGORY_KIND.USER_VOTE`)
 * oferecem os membros do evento que não são admins.
 */
export async function getVotingBoard(eventId: string, userId: string): Promise<EventVotingBoardDto | null> {
  // Dados do evento carregados em paralelo.
  const [event, votingPhase, categories, nominees, members] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.eventPhase.findFirst({ where: { eventId, type: "VOTING", isActive: true } }),
    prisma.awardCategory.findMany({ where: { eventId, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.nominee.findMany({ where: { eventId, status: "approved" } }),
    prisma.eventMember.findMany({ where: { eventId } }),
  ]);
  if (!event) return null;

  // Nomes dos membros e os votos já dados por este utilizador.
  const [memberUserMap, myVotes] = await Promise.all([
    loadUsersById(
      members.map((m) => m.userId),
      (where) => prisma.user.findMany({ where, select: { id: true, displayName: true, email: true } }),
    ),
    prisma.vote.findMany({
      where: { eventId, userId, categoryId: { in: categoryIds(categories) } },
      select: { categoryId: true, nomineeId: true, targetUserId: true },
    }),
  ]);

  // Escolha atual por categoria.
  const myVoteMap = new Map(myVotes.map((v) => [v.categoryId, v.nomineeId ?? v.targetUserId ?? null]));

  const memberOptions = toMemberOptions(members, memberUserMap);
  const categoriesDto = categories.map((category): EventVotingCategoryDto => {
    const isPersonCategory = category.kind === CATEGORY_KIND.USER_VOTE;
    return {
      id: category.id,
      title: category.name,
      kind: category.kind,
      description: category.description,
      voteQuestion: category.voteQuestion,
      options: isPersonCategory ? memberOptions : toNomineeOptions(nominees, category.id),
      myOptionId: myVoteMap.get(category.id) ?? null,
    };
  });

  // Só se pode votar dentro da fase de votação ativa.
  const canVote = isVotingOpen(votingPhase, new Date());

  return {
    eventId,
    canVote,
    categories: categoriesDto,
  };
}

/** Os ids das categorias, para filtrar os votos. */
function categoryIds(categories: { id: string }[]): string[] {
  return categories.map((c) => c.id);
}

/** Códigos de erro de voto que o cliente sabe tratar. */
type VoteErrorCode = "VOTING_CLOSED" | "CATEGORY_NOT_FOUND" | "INVALID_SELECTION";

// Estado HTTP e mensagem de cada erro.
const VOTE_ERRORS: Record<VoteErrorCode, { status: number; message: string }> = {
  VOTING_CLOSED: { status: 409, message: "A votação não está aberta." },
  CATEGORY_NOT_FOUND: { status: 404, message: "Esta categoria não existe ou não está ativa." },
  INVALID_SELECTION: { status: 400, message: "Esta opção não pertence à categoria." },
};

/** Erro de voto, com estado HTTP, código e mensagem em português. */
class VoteError extends HttpError {
  constructor(override readonly code: VoteErrorCode) {
    super(VOTE_ERRORS[code].status, code, VOTE_ERRORS[code].message);
    this.name = "VoteError";
  }
}

/**
 * Regista (ou altera) o voto do utilizador numa categoria. Só dentro das datas da fase de votação
 * ativa e só para uma opção que o quadro oferece: um nomeado aprovado dessa categoria, ou um
 * membro que não seja admin nas categorias de pessoas.
 */
export async function castVote(
  eventId: string,
  userId: string,
  categoryId: string,
  selectionId: string,
): Promise<EventVoteDto> {
  // 1. A votação tem de estar aberta.
  const votingPhase = await prisma.eventPhase.findFirst({
    where: { eventId, type: "VOTING", isActive: true },
  });
  if (!isVotingOpen(votingPhase, new Date())) throw new VoteError("VOTING_CLOSED");

  // 2. A categoria tem de existir neste evento e estar ativa.
  const category = await prisma.awardCategory.findFirst({
    where: { id: categoryId, eventId, isActive: true },
  });
  if (!category) throw new VoteError("CATEGORY_NOT_FOUND");

  // 3. Valida a opção e grava (upsert: um voto por pessoa e categoria, voltar a votar substitui).
  if (category.kind === CATEGORY_KIND.USER_VOTE) {
    const target = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId, userId: selectionId } },
      select: { role: true },
    });
    if (!target || target.role === "admin") throw new VoteError("INVALID_SELECTION");

    await prisma.vote.upsert({
      where: { categoryId_userId: { categoryId, userId } },
      update: { targetUserId: selectionId, nomineeId: null },
      create: { eventId, categoryId, userId, targetUserId: selectionId },
    });
  } else {
    const nominee = await prisma.nominee.findFirst({
      where: { id: selectionId, eventId, categoryId, status: "approved" },
      select: { id: true },
    });
    if (!nominee) throw new VoteError("INVALID_SELECTION");

    await prisma.vote.upsert({
      where: { categoryId_userId: { categoryId, userId } },
      update: { nomineeId: selectionId, targetUserId: null },
      create: { eventId, categoryId, userId, nomineeId: selectionId },
    });
  }

  return { categoryId, selectionId };
}

/** Regista a proposta de uma nova categoria como `pending`, para o admin moderar. */
export async function createProposal(
  eventId: string,
  userId: string,
  { name, description, kind }: { name: string; description?: string | null; kind?: number },
): Promise<EventProposalDto> {
  // Nasce sempre pendente: só o admin a aprova.
  const proposal = await prisma.categoryProposal.create({
    data: {
      eventId,
      proposedByUserId: userId,
      name: name.trim(),
      description: description?.trim() ?? null,
      kind: kind ?? CATEGORY_KIND.NOMINEE,
      status: "pending",
    },
  });

  return {
    id: proposal.id,
    eventId: proposal.eventId,
    userId: proposal.proposedByUserId,
    name: proposal.name,
    description: proposal.description,
    status: proposal.status,
  };
}
