import { describe, expect, it } from "vitest";

import { classifyRelease, HOLD_MS, SWIPE_DISTANCE_PX } from "./storyGestures";

const QUICK_MS = HOLD_MS - 50;
const LONG_MS = HOLD_MS + 50;
const FAR = SWIPE_DISTANCE_PX + 10;
const NEAR = SWIPE_DISTANCE_PX - 10;

describe("classifyRelease", () => {
  it("is a tap when the finger is lifted quickly without moving", () => {
    expect(classifyRelease({ dx: 3, dy: -2, heldMs: QUICK_MS })).toBe("tap");
  });

  it("is a hold when the finger stayed down long enough, so nothing else should happen", () => {
    expect(classifyRelease({ dx: 0, dy: 0, heldMs: LONG_MS })).toBe("hold");
  });

  it("closes with a downward swipe, however long it took", () => {
    expect(classifyRelease({ dx: 5, dy: FAR, heldMs: QUICK_MS })).toBe("close");
    expect(classifyRelease({ dx: 5, dy: FAR, heldMs: LONG_MS })).toBe("close");
  });

  it("does not close with an upward swipe", () => {
    expect(classifyRelease({ dx: 0, dy: -FAR, heldMs: QUICK_MS })).toBe("tap");
  });

  it("goes to the next member with a swipe to the left and to the previous with one to the right", () => {
    expect(classifyRelease({ dx: -FAR, dy: 4, heldMs: QUICK_MS })).toBe("next-author");
    expect(classifyRelease({ dx: FAR, dy: 4, heldMs: QUICK_MS })).toBe("previous-author");
  });

  it("ignores a movement shorter than the swipe distance", () => {
    expect(classifyRelease({ dx: -NEAR, dy: NEAR, heldMs: QUICK_MS })).toBe("tap");
  });

  it("follows the direction that moved the most when the swipe is diagonal", () => {
    expect(classifyRelease({ dx: -FAR, dy: FAR + 40, heldMs: QUICK_MS })).toBe("close");
    expect(classifyRelease({ dx: -(FAR + 40), dy: FAR, heldMs: QUICK_MS })).toBe("next-author");
  });
});
