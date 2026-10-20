import { prisma } from "@/lib/prisma";
import type { AdminVotesPagedDto, PagedResult, AdminCategoryResultDto } from "@/lib/api/types";
import { CATEGORY_KIND } from "@/lib/categoryKind";
import { loadUsersById } from "@/lib/usersById";

/* O que o admin vê da votação: cada voto individual e os resultados oficiais até agora. */

/** Votos em nomeados do evento, os alterados há menos tempo primeiro, com os nomes da categoria, do nomeado e de quem votou. */
export async function getAdminVotesPaged(eventId: string, skip = 0, take = 50): Promise<AdminVotesPagedDto> {
  // Os votos pertencem a categorias; filtra-se por elas para ficar só neste evento.
  const categoryIds = (
    await prisma.awardCategory.findMany({
      where: { eventId },
      select: { id: true },
    })
  ).map((c) => c.id);

  const totalVotes = await prisma.vote.count({ where: { categoryId: { in: categoryIds } } });

  if (totalVotes === 0) {
    return { total: 0, votes: [], skip, take, hasMore: false };
  }

  const pagedVotes = await prisma.vote.findMany({
    where: { categoryId: { in: categoryIds } },
    orderBy: { updatedAtUtc: "desc" },
    skip,
    take,
  });

  // Nomes de categorias, nomeados e votantes carregados de uma vez para a página.
  const catIds = [...new Set(pagedVotes.map((v) => v.categoryId))];
  const nomineeIds = [...new Set(pagedVotes.map((v) => v.nomineeId))];
  const [categories, nominees, userMap] = await Promise.all([
    prisma.awardCategory.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } }),
    prisma.nominee.findMany({ where: { id: { in: nomineeIds } }, select: { id: true, title: true } }),
    loadUsersById(
      pagedVotes.map((v) => v.userId),
      (where) => prisma.user.findMany({ where, select: { id: true, displayName: true, email: true } }),
    ),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const nomMap = new Map(nominees.map((n) => [n.id, n.title]));

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
    skip,
    take,
    hasMore: skip + take < totalVotes,
  };
}

/** Um voto numa pessoa (categorias de pessoas). */
type UserVoteRow = { categoryId: string; voterUserId: string; targetUserId: string };
/** Uma linha de resultado de uma categoria. */
type NomineeResult = AdminCategoryResultDto["nominees"][number];

/** Votos de uma categoria por membro votado, o mais votado primeiro, com os nomes de quem votou. */
function tallyCategory(votes: UserVoteRow[], nameOf: (userId: string) => string): NomineeResult[] {
  const byTarget = new Map<string, string[]>();
  for (const vote of votes) {
    byTarget.set(vote.targetUserId, [...(byTarget.get(vote.targetUserId) ?? []), nameOf(vote.voterUserId)]);
  }
  return [...byTarget.entries()]
    .map(([targetUserId, voterNames]) => ({
      nomineeId: targetUserId,
      title: nameOf(targetUserId),
      imageUrl: null,
      voteCount: voterNames.length,
      voterNames,
    }))
    .sort((left, right) => right.voteCount - left.voteCount);
}

/** Nome (ou email) de cada utilizador, para etiquetar os votos. */
async function getUserNames(userIds: string[]) {
  const users = await loadUsersById(userIds, (where) =>
    prisma.user.findMany({ where, select: { id: true, displayName: true, email: true } }),
  );
  return (userId: string) => users.get(userId)?.displayName ?? users.get(userId)?.email ?? "Unknown";
}

/** Resultados oficiais por categoria até agora, para o admin, em qualquer fase (os membros só os veem em RESULTS). */
export async function getAdminOfficialResultsPaged(
  eventId: string,
  skip = 0,
  take = 50,
): Promise<PagedResult<AdminCategoryResultDto>> {
  // Só as categorias de pessoas têm votos em utilizadores.
  const where = { eventId, kind: CATEGORY_KIND.USER_VOTE };
  const [members, categories, total] = await Promise.all([
    prisma.eventMember.count({ where: { eventId } }),
    prisma.awardCategory.findMany({ where, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], skip, take }),
    prisma.awardCategory.count({ where }),
  ]);

  const categoryIds = categories.map((category) => category.id);
  const userVotes = await prisma.userVote.findMany({ where: { eventId, categoryId: { in: categoryIds } } });
  const nameOf = await getUserNames([...new Set(userVotes.flatMap((vote) => [vote.voterUserId, vote.targetUserId]))]);

  const items = categories.map((category): AdminCategoryResultDto => {
    const nominees = tallyCategory(
      userVotes.filter((vote) => vote.categoryId === category.id),
      nameOf,
    );
    // A participação é o total de votos a dividir pelo número de membros.
    const totalVotes = nominees.reduce((sum, nominee) => sum + nominee.voteCount, 0);
    return {
      categoryId: category.id,
      categoryName: category.name,
      totalVotes,
      participationRate: members > 0 ? totalVotes / members : 0,
      nominees,
    };
  });

  return { items, total, skip, take, hasMore: skip + take < total };
}
