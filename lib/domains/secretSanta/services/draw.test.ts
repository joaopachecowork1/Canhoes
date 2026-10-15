import { describe, expect, it } from "vitest";

import { drawSecretSanta } from "./draw";

/** Deterministic PRNG (mulberry32) so failures can be replayed from the seed. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const people = (count: number) => Array.from({ length: count }, (_, index) => `user-${index}`);

describe("drawSecretSanta", () => {
  it.each([2, 3, 5, 12, 40])("gives every one of %i participants exactly one other person", (count) => {
    for (let seed = 1; seed <= 200; seed++) {
      const pairs = drawSecretSanta(people(count), seededRandom(seed));

      expect(pairs).toHaveLength(count);
      expect(pairs.every((pair) => pair.giverUserId !== pair.receiverUserId)).toBe(true);
      expect(new Set(pairs.map((pair) => pair.giverUserId)).size).toBe(count);
      expect(new Set(pairs.map((pair) => pair.receiverUserId)).size).toBe(count);
    }
  });

  it("forms a single cycle, so no small group only exchanges among itself", () => {
    const pairs = drawSecretSanta(people(10), seededRandom(7));
    const receiverOf = new Map(pairs.map((pair) => [pair.giverUserId, pair.receiverUserId]));

    const visited = new Set<string>();
    let current = "user-0";
    while (!visited.has(current)) {
      visited.add(current);
      current = receiverOf.get(current)!;
    }
    expect(visited.size).toBe(10);
  });

  it("ignores duplicate participant ids", () => {
    const pairs = drawSecretSanta(["a", "b", "a", "c"], seededRandom(1));
    expect(pairs.map((pair) => pair.giverUserId).sort()).toEqual(["a", "b", "c"]);
  });

  it("is reproducible for the same random source", () => {
    expect(drawSecretSanta(people(8), seededRandom(42))).toEqual(drawSecretSanta(people(8), seededRandom(42)));
  });

  it("refuses fewer than two participants", () => {
    expect(() => drawSecretSanta([])).toThrow(RangeError);
    expect(() => drawSecretSanta(["only-me", "only-me"])).toThrow(RangeError);
  });
});
