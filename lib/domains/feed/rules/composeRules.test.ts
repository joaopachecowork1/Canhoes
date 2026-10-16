import { describe, expect, it } from "vitest";

import { getFileKey, getFilledPollOptions, isPollReady, moveItem } from "./composeRules";

describe("moveItem", () => {
  it("swaps an item with its neighbour", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
  });

  it("returns the same list past either end", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 1, 1)).toBe(items);
  });
});

describe("poll rules", () => {
  it("ignores blank options", () => {
    expect(getFilledPollOptions([" Sim ", "", "  "])).toEqual(["Sim"]);
  });

  it("needs a question and two filled options", () => {
    expect(isPollReady("Quem ganha?", ["A", "B"])).toBe(true);
    expect(isPollReady("  ", ["A", "B"])).toBe(false);
    expect(isPollReady("Quem ganha?", ["A", " "])).toBe(false);
  });
});

describe("getFileKey", () => {
  it("is the same for the same file", () => {
    const file = { name: "a.jpg", size: 10, lastModified: 1 };
    expect(getFileKey(file)).toBe(getFileKey({ ...file }));
  });
});
