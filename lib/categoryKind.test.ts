import { describe, expect, it } from "vitest";

import { CATEGORY_KIND, canNominate } from "./categoryKind";

describe("canNominate", () => {
  it("is true only for the categories members nominate into", () => {
    expect(canNominate(CATEGORY_KIND.NOMINEE)).toBe(true);
    expect(canNominate(CATEGORY_KIND.USER_VOTE)).toBe(false);
    expect(canNominate(CATEGORY_KIND.STICKER)).toBe(false);
  });
});
