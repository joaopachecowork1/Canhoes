import { prisma } from "@/lib/prisma";
import type {
  AdminVotesPagedDto,
  PagedResult,
  AdminCategoryResultDto,
} from "@/lib/api/types";
import { KindUserVote } from "./constants";

/* What the admin sees of the voting: every individual vote and the official results so far. */

/** Nominee votes of the event, most recently changed first, with category, nominee and voter names. */
export async function getAdminVotesPaged(
  eventId: string,
  skip = 0,
  take = 50
): Promise<AdminVotesPagedDto> {
  const categoryIds = (await prisma.awardCategory.findMany({
    where: { eventId },
    select: { id: true },
  })).map((c) => c.id);

  const totalVotes = categoryIds.length > 0
    ? await prisma.vote.count({ where: { categoryId: { in: categoryIds } } })
    : 0;

  if (totalVotes === 0) {
    return { total: 0, votes: [], skip, take, hasMore: false };
  }

  const pagedVotes = await prisma.vote.findMany({
    where: { categoryId: { in: categoryIds } },
    orderBy: { updatedAtUtc: "desc" },
    skip, take,
  });

  const catIds = [...new Set(pagedVotes.map((v) => v.categoryId))];
  const nomineeIds = [...new Set(pagedVotes.map((v) => v.nomineeId))];
  const voterUserIds = [...new Set(pagedVotes.map((v) => v.userId))];
  const [categories, nominees, users] = await Promise.all([
    catIds.length > 0 ? prisma.awardCategory.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    nomineeIds.length > 0 ? prisma.nominee.findMany({ where: { id: { in: nomineeIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
    voterUserIds.length > 0 ? prisma.user.findMany({ where: { id: { in: voterUserIds } }, select: { id: true, displayName: true, email: true } }) : Promise.resolve([]),
  ]);
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const nomMap = new Map(nominees.map((n) => [n.id, n.title]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    total: totalVotes,
    votes: pagedVotes.map((v) => ({
      categoryId: v.categoryId,
      categoryName: catMap.get(v.categoryId) ?? "Unknown",
      nomineeId: v.nomineeId,
      nomineeName: nomMap.get(v.nomineeId) ?? "Unknown",
      userId: v.userId,
      userName: userMap.get(v.userId)?.displayName ?? userMap.get(v.userId)?.email ?? "Unknown",
      updatedAtUtc: v.updatedAtUtc.toISOString(),
    })),
    skip, take,
    hasMore: skip + take < totalVotes,
  };
}

/** Official results per category so far, for the admin, at any phase (members only see them in RESULTS). */
export async function getAdminOfficialResultsPaged(
  eventId: string,
  skip = 0,
  take = 50
): Promise<PagedResult<AdminCategoryResultDto>> {
  const members = await prisma.eventMember.count({ where: { eventId } });

  const categories = await prisma.awardCategory.findMany({
    where: { eventId, kind: KindUserVote },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    skip, take,
  });

  const total = await prisma.awardCategory.count({
    where: { eventId, kind: KindUserVote },
  });

  const categoryIds = categories.map((c) => c.id);
  const userVotes = categoryIds.length > 0
    ? await prisma.userVote.findMany({ where: { eventId, categoryId: { in: categoryIds } } })
    : [];

  const voterIds = [...new Set(userVotes.map((v) => v.voterUserId))];
  const voterUsers = voterIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: voterIds } }, select: { id: true, displayName: true, email: true } })
    : [];
  const voterMap = new Map(voterUsers.map((u) => [u.id, u]));

  const votesByCategory = new Map<string, Map<string, { count: number; voters: string[] }>>();
  for (const vote of userVotes) {
    if (!votesByCategory.has(vote.categoryId)) {
      votesByCategory.set(vote.categoryId, new Map());
    }
    const catVotes = votesByCategory.get(vote.categoryId)!;
    if (!catVotes.has(vote.targetUserId)) {
      catVotes.set(vote.targetUserId, { count: 0, voters: [] });
    }
    const entry = catVotes.get(vote.targetUserId)!;
    entry.count++;
    const v = voterMap.get(vote.voterUserId);
    entry.voters.push(v?.displayName ?? v?.email ?? "Unknown");
  }

  const items: AdminCategoryResultDto[] = categories.map((cat) => {
    const catVotes = votesByCategory.get(cat.id) ?? new Map();
    const tallies = [...catVotes.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([targetUserId, data]: [string, { count: number; voters: string[] }]) => ({
        nomineeId: targetUserId,
        title: targetUserId,
        imageUrl: null as string | null,
        voteCount: data.count,
        voterUserIds: data.voters,
      }));

    const totalVotes = tallies.reduce((s, t) => s + t.voteCount, 0);

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      totalVotes,
      participationRate: members > 0 ? totalVotes / members : 0,
      nominees: tallies,
    };
  });

  return {
    items,
    total,
    skip, take,
    hasMore: skip + take < total,
  };
}
