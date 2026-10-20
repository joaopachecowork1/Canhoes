import type { CastOfficialVoteRequest, EventVotingBoardDto, EventVotingCategoryDto } from "@/lib/api/types";

/** O boletim depois de um voto, antes de o servidor o confirmar. */
export function applyVoteSelection(board: EventVotingBoardDto, vote: CastOfficialVoteRequest): EventVotingBoardDto {
  return {
    ...board,
    categories: board.categories.map((category) =>
      category.id === vote.categoryId ? { ...category, myOptionId: vote.selectionId } : category,
    ),
  };
}

/** Quanto do boletim já está preenchido. */
export function getVotingProgress(categories: EventVotingCategoryDto[]) {
  const total = categories.length;
  const voted = categories.filter((category) => Boolean(category.myOptionId)).length;
  return {
    total,
    voted,
    percentage: total > 0 ? Math.round((voted / total) * 100) : 0,
    isComplete: total > 0 && voted === total,
  };
}
