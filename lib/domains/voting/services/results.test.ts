import { describe, expect, it } from "vitest";

import { rankCategory } from "./results";

const category = { id: "c1", name: "Melhor momento" };
const candidates = new Map([
  ["a", { title: "Jantar", imageUrl: "/uploads/a.png" }],
  ["b", { title: "Viagem", imageUrl: null }],
  ["c", { title: "Karaoke", imageUrl: null }],
]);

describe("rankCategory", () => {
  it("orders by vote count with titles and images", () => {
    expect(rankCategory(category, ["b", "a", "b", "c", "b", "a"], candidates)).toEqual({
      categoryId: "c1",
      categoryName: "Melhor momento",
      totalVotes: 6,
      top: [
        { nomineeId: "b", title: "Viagem", imageUrl: null, voteCount: 3 },
        { nomineeId: "a", title: "Jantar", imageUrl: "/uploads/a.png", voteCount: 2 },
        { nomineeId: "c", title: "Karaoke", imageUrl: null, voteCount: 1 },
      ],
    });
  });

  it("keeps first-seen order on ties and only the top five", () => {
    const many = new Map(
      Array.from({ length: 7 }, (_, index) => [`n${index}`, { title: `N${index}`, imageUrl: null }]),
    );
    const ranked = rankCategory(category, [...many.keys()], many);
    expect(ranked.top.map((entry) => entry.nomineeId)).toEqual(["n0", "n1", "n2", "n3", "n4"]);
    expect(ranked.totalVotes).toBe(7);
  });

  it("skips selections without a candidate but still counts their votes", () => {
    const ranked = rankCategory(category, ["a", "gone"], candidates);
    expect(ranked.top.map((entry) => entry.nomineeId)).toEqual(["a"]);
    expect(ranked.totalVotes).toBe(2);
  });

  it("returns an empty podium without votes", () => {
    expect(rankCategory(category, [], candidates)).toMatchObject({ totalVotes: 0, top: [] });
  });
});
