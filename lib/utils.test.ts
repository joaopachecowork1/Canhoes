import { describe, expect, it } from "vitest";

import { formatCount } from "./utils";

describe("formatCount", () => {
  it("uses the singular only for exactly one", () => {
    expect(formatCount(0, "voto", "votos")).toBe("0 votos");
    expect(formatCount(1, "voto", "votos")).toBe("1 voto");
    expect(formatCount(2, "voto", "votos")).toBe("2 votos");
  });
});
