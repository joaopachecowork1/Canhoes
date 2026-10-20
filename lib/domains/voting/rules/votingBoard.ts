import type { CastOfficialVoteRequest, EventVotingBoardDto, EventVotingCategoryDto } from "@/lib/api/types";

/** The ballot after a vote, before the server confirms it. */
export function applyVoteSelection(board: EventVotingBoardDto, vote: CastOfficialVoteRequest): EventVotingBoardDto {
  return {
    ...board,
    categories: board.categories.map((category) =>
      category.id === vote.categoryId ? { ...category, myOptionId: vote.selectionId } : category,
    ),
  };
}

/** How much of the ballot is filled in. */
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
