import { describe, expect, it } from "vitest";

import { getMemberName } from "./memberName";

describe("getMemberName", () => {
  it("uses the display name when there is one", () => {
    expect(getMemberName({ displayName: "Ana Silva", email: "ana@canhoes.pt" })).toBe("Ana Silva");
  });

  it("falls back to the start of the email", () => {
    expect(getMemberName({ displayName: null, email: "rui.silva@canhoes.pt" })).toBe("rui.silva");
  });
});
