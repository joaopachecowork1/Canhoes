import { HttpError } from "@/lib/api/httpError";
import { prisma } from "@/lib/prisma";
import { KindUserVote } from "@/lib/domains/admin/services/constants";
import { isVotingOpen } from "@/lib/domains/event/services/eventRules";
import type {
  EventVotingBoardDto,
  EventVotingCategoryDto,
  EventVoteOptionDto,
  EventProposalDto,
} from "@/lib/api/types";

/*
 * The members' side of the awards: the voting board, casting a vote and proposing new categories.
 * A vote counts only inside the active voting phase's dates (`isVotingOpen` in `eventRules.ts`).
 */

type EventVoteDto = {
  categoryId: string;
  selectionId: string;
};

/**
 * The voting board: every active category with its options and the user's current choice. Nominee
 * categories offer their approved nominations; person categories (`KindUserVote`) offer the
 * event's non-admin members.
 */
export async function getVotingBoard(
  eventId: string,
  userId: string
): Promise<EventVotingBoardDto | null> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const votingPhase = await prisma.eventPhase.findFirst({
    where: { eventId, type: "VOTING", isActive: true },
  });

  const categories = await prisma.awardCategory.findMany({
    where: { eventId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const nominees = await prisma.nominee.findMany({
    where: { eventId, status: "approved" },
  });

  const members = await prisma.eventMember.findMany({
    where: { eventId },
  });

  const memberUserIds = [...new Set(members.map((m) => m.userId))];
  const memberUsers = memberUserIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: memberUserIds } }, select: { id: true, displayName: true, email: true } })
    : [];
  const memberUserMap = new Map(memberUsers.map((u) => [u.id, u]));

  const [nomineeVotes, userVotes] = await Promise.all([
    categoryIds(categories).length > 0
      ? prisma.vote.findMany({
          where: { eventId, userId, categoryId: { in: categoryIds(categories) } },
          select: { categoryId: true, nomineeId: true },
        })
      : Promise.resolve([]),
    categoryIds(categories).length > 0
      ? prisma.userVote.findMany({
          where: { eventId, voterUserId: userId, categoryId: { in: categoryIds(categories) } },
          select: { categoryId: true, targetUserId: true },
        })
      : Promise.resolve([]),
  ]);

  const nomineeVoteMap = new Map(nomineeVotes.map((v) => [v.categoryId, v.nomineeId]));
  const userVoteMap = new Map(userVotes.map((v) => [v.categoryId, v.targetUserId]));

  const categoriesDto: EventVotingCategoryDto[] = categories.map((cat) => {
    let options: EventVoteOptionDto[];
    let mySelectionId: string | null = null;

    if (cat.kind === KindUserVote) {
      options = members
        .filter((m) => m.role !== "admin")
        .sort((a, b) => {
          const uA = memberUserMap.get(a.userId);
          const uB = memberUserMap.get(b.userId);
          return (uA?.displayName ?? uA?.email ?? "").localeCompare(uB?.displayName ?? uB?.email ?? "");
        })
        .map((m) => {
          const u = memberUserMap.get(m.userId);
          return {
            id: m.userId,
            label: u?.displayName ?? u?.email ?? "Unknown",
            imageUrl: null,
          };
        });

      const targetId = userVoteMap.get(cat.id);
      mySelectionId = targetId ?? null;
    } else {
      options = nominees
        .filter((n) => n.categoryId === cat.id)
        .map((n) => ({
          id: n.id,
          label: n.title,
          imageUrl: null,
        }));

      const nomId = nomineeVoteMap.get(cat.id);
      mySelectionId = nomId ?? null;
    }

    return {
      id: cat.id,
      title: cat.name,
      kind: cat.kind,
      description: cat.description,
      voteQuestion: cat.voteQuestion,
      options,
      myOptionId: mySelectionId,
    };
  });

  const canVote = isVotingOpen(votingPhase, new Date());

  return {
    eventId,
    phaseId: votingPhase?.id ?? null,
    canVote,
    categories: categoriesDto,
  };
}

function categoryIds(categories: { id: string }[]): string[] {
  return categories.map((c) => c.id);
}

type VoteErrorCode = "VOTING_CLOSED" | "CATEGORY_NOT_FOUND" | "INVALID_SELECTION";

const VOTE_ERRORS: Record<VoteErrorCode, { status: number; message: string }> = {
  VOTING_CLOSED: { status: 409, message: "A votação não está aberta." },
  CATEGORY_NOT_FOUND: { status: 404, message: "Esta categoria não existe ou não está ativa." },
  INVALID_SELECTION: { status: 400, message: "Esta opção não pertence à categoria." },
};

class VoteError extends HttpError {
  constructor(override readonly code: VoteErrorCode) {
    super(VOTE_ERRORS[code].status, code, VOTE_ERRORS[code].message);
    this.name = "VoteError";
  }
}

/**
 * Records (or changes) the user's vote in a category. Only inside the active voting phase's dates,
 * and only for an option the voting board offers: an approved nominee of that category, or a
 * non-admin member for person categories.
 */
export async function castVote(
  eventId: string,
  userId: string,
  categoryId: string,
  selectionId: string
): Promise<EventVoteDto> {
  const votingPhase = await prisma.eventPhase.findFirst({
    where: { eventId, type: "VOTING", isActive: true },
  });
  if (!isVotingOpen(votingPhase, new Date())) throw new VoteError("VOTING_CLOSED");

  const category = await prisma.awardCategory.findFirst({
    where: { id: categoryId, eventId, isActive: true },
  });
  if (!category) throw new VoteError("CATEGORY_NOT_FOUND");

  if (category.kind === KindUserVote) {
    const target = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId, userId: selectionId } },
      select: { role: true },
    });
    if (!target || target.role === "admin") throw new VoteError("INVALID_SELECTION");

    await prisma.userVote.upsert({
      where: { categoryId_voterUserId: { categoryId, voterUserId: userId } },
      update: { targetUserId: selectionId },
      create: { eventId, categoryId, voterUserId: userId, targetUserId: selectionId },
    });
  } else {
    const nominee = await prisma.nominee.findFirst({
      where: { id: selectionId, eventId, categoryId, status: "approved" },
      select: { id: true },
    });
    if (!nominee) throw new VoteError("INVALID_SELECTION");

    await prisma.vote.upsert({
      where: { categoryId_userId: { categoryId, userId } },
      update: { nomineeId: selectionId },
      create: { eventId, categoryId, userId, nomineeId: selectionId },
    });
  }

  return { categoryId, selectionId };
}

/** Records a proposal for a new category as `pending`, for the admin to moderate. */
export async function createProposal(
  eventId: string,
  userId: string,
  name: string,
  description?: string | null,
  kind?: number
): Promise<EventProposalDto> {
  const proposal = await prisma.categoryProposal.create({
    data: {
      eventId,
      proposedByUserId: userId,
      name: name.trim(),
      description: description?.trim() ?? null,
      kind: kind ?? 0,
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
    createdAt: proposal.createdAtUtc.toISOString(),
  };
}
