import { prisma } from "@/lib/prisma";
import type { PublicCategoryResultDto } from "@/lib/api/types";
import { CATEGORY_KIND } from "@/lib/categoryKind";
import { loadUsersById } from "@/lib/usersById";

// Quantos lugares do pódio se mostram por categoria.
const TOP_PLACES = 5;

/** Quem pode ganhar: um nomeado ou uma pessoa. */
type Candidate = { title: string; imageUrl: string | null };

/**
 * Ordena as seleções de uma categoria por número de votos (os empates mantêm a ordem em que
 * apareceram), guarda os primeiros lugares e conta todos os votos em `totalVotes`. As seleções
 * sem candidato (um nomeado apagado, um utilizador que saiu) são ignoradas.
 */
export function rankCategory(
  category: { id: string; name: string },
  selectionIds: readonly string[],
  candidates: ReadonlyMap<string, Candidate>,
): PublicCategoryResultDto {
  // Conta os votos de cada seleção.
  const votesBySelection = new Map<string, number>();
  for (const selectionId of selectionIds) {
    votesBySelection.set(selectionId, (votesBySelection.get(selectionId) ?? 0) + 1);
  }

  // Junta cada seleção ao seu candidato, ordena do mais votado para o menos e corta no pódio.
  const top = [...votesBySelection.entries()]
    .flatMap(([selectionId, voteCount]) => {
      const candidate = candidates.get(selectionId);
      return candidate ? [{ nomineeId: selectionId, ...candidate, voteCount }] : [];
    })
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, TOP_PLACES);

  return { categoryId: category.id, categoryName: category.name, totalVotes: selectionIds.length, top };
}

/** Resultados oficiais por categoria ativa: nomeados nas categorias de nomeados, pessoas nas de pessoas. */
export async function getResults(eventId: string): Promise<PublicCategoryResultDto[]> {
  const categories = await prisma.awardCategory.findMany({
    where: { eventId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // Carrega tudo o que é preciso de uma vez: votos nas pessoas, votos nos nomeados, nomeados aprovados e membros.
  const [userVotes, nomineeVotes, nominees, members] = await Promise.all([
    prisma.userVote.findMany({ where: { eventId }, select: { categoryId: true, targetUserId: true } }),
    prisma.vote.findMany({ where: { eventId }, select: { categoryId: true, nomineeId: true } }),
    prisma.nominee.findMany({ where: { eventId, status: "approved" } }),
    prisma.eventMember.findMany({ where: { eventId }, select: { userId: true } }),
  ]);

  const users = await loadUsersById(
    members.map((member) => member.userId),
    (where) => prisma.user.findMany({ where, select: { id: true, displayName: true, email: true } }),
  );

  // Candidatos por id: pessoas (sem imagem) e nomeados aprovados.
  const people = new Map<string, Candidate>(
    [...users.values()].map((user) => [user.id, { title: user.displayName ?? user.email, imageUrl: null }]),
  );
  const nomineeCandidates = new Map<string, Candidate>(
    nominees.map((nominee) => [nominee.id, { title: nominee.title, imageUrl: nominee.imageUrl }]),
  );

  // Cada categoria é ordenada com os votos e candidatos do seu tipo.
  return categories.map((category) =>
    category.kind === CATEGORY_KIND.USER_VOTE
      ? rankCategory(
          category,
          userVotes.filter((vote) => vote.categoryId === category.id).map((vote) => vote.targetUserId),
          people,
        )
      : rankCategory(
          category,
          nomineeVotes.filter((vote) => vote.categoryId === category.id).map((vote) => vote.nomineeId),
          nomineeCandidates,
        ),
  );
}
