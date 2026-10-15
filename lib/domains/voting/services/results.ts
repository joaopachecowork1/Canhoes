import { prisma } from "@/lib/prisma";
import type { PublicCategoryResultDto } from "@/lib/api/types";
import { KindUserVote } from "@/lib/domains/admin/services/constants";

const TOP_PLACES = 5;

type Candidate = { title: string; imageUrl: string | null };

/**
 * Ranks the selections of one category by vote count (ties keep the order they first appeared
 * in), keeps the top places and counts every vote in `totalVotes`. Selections without a
 * candidate (a deleted nominee, a user who left) are skipped.
 */
export function rankCategory(
  category: { id: string; name: string },
  selectionIds: readonly string[],
  candidates: ReadonlyMap<string, Candidate>
): PublicCategoryResultDto {
  const votesBySelection = new Map<string, number>();
  for (const selectionId of selectionIds) {
    votesBySelection.set(selectionId, (votesBySelection.get(selectionId) ?? 0) + 1);
  }

  const top = [...votesBySelection.entries()]
    .flatMap(([selectionId, voteCount]) => {
      const candidate = candidates.get(selectionId);
      return candidate ? [{ nomineeId: selectionId, ...candidate, voteCount }] : [];
    })
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, TOP_PLACES);

  return { categoryId: category.id, categoryName: category.name, totalVotes: selectionIds.length, top };
}

/** Official results per active category: nominees for nominee categories, people for person categories. */
export async function getResults(eventId: string): Promise<PublicCategoryResultDto[]> {
  const categories = await prisma.awardCategory.findMany({
    where: { eventId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const [userVotes, nomineeVotes, nominees, members] = await Promise.all([
    prisma.userVote.findMany({ where: { eventId }, select: { categoryId: true, targetUserId: true } }),
    prisma.vote.findMany({ where: { eventId }, select: { categoryId: true, nomineeId: true } }),
    prisma.nominee.findMany({ where: { eventId, status: "approved" } }),
    prisma.eventMember.findMany({ where: { eventId }, select: { userId: true } }),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: members.map((member) => member.userId) } },
    select: { id: true, displayName: true, email: true },
  });

  const people = new Map<string, Candidate>(
    users.map((user) => [user.id, { title: user.displayName ?? user.email, imageUrl: null }])
  );
  const nomineeCandidates = new Map<string, Candidate>(
    nominees.map((nominee) => [nominee.id, { title: nominee.title, imageUrl: nominee.imageUrl }])
  );

  return categories.map((category) =>
    category.kind === KindUserVote
      ? rankCategory(
          category,
          userVotes.filter((vote) => vote.categoryId === category.id).map((vote) => vote.targetUserId),
          people
        )
      : rankCategory(
          category,
          nomineeVotes.filter((vote) => vote.categoryId === category.id).map((vote) => vote.nomineeId),
          nomineeCandidates
        )
  );
}
