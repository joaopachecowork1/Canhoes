import { describe, expect, it } from "vitest";

import type { EventVotingCategoryDto } from "@/lib/api/types";

import { applyVoteSelection, getVotingProgress } from "./votingBoard";

const category = (id: string, myOptionId: string | null = null): EventVotingCategoryDto => ({
  id,
  title: id,
  kind: 0,
  description: null,
  voteQuestion: null,
  options: [],
  myOptionId,
});

describe("applyVoteSelection", () => {
  it("marks the chosen option in that category only", () => {
    const board = { eventId: "e", canVote: true, categories: [category("a"), category("b")] };
    const updated = applyVoteSelection(board, { categoryId: "b", selectionId: "x" });
    expect(updated.categories.map((entry) => entry.myOptionId)).toEqual([null, "x"]);
  });
});

describe("getVotingProgress", () => {
  it("counts voted categories and rounds the percentage", () => {
    expect(getVotingProgress([category("a", "x"), category("b"), category("c")])).toEqual({
      total: 3,
      voted: 1,
      percentage: 33,
      isComplete: false,
    });
  });

  it("is complete only when every category has a vote", () => {
    expect(getVotingProgress([category("a", "x")]).isComplete).toBe(true);
    expect(getVotingProgress([]).isComplete).toBe(false);
  });
});
