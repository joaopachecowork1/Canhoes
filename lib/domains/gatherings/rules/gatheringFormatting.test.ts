import { describe, expect, it } from "vitest";
import { formatGatheringDate } from "./gatheringFormatting";

describe("formatGatheringDate", () => {
  it("formats valid YYYY-MM-DD ISO dates into localized Portuguese format", () => {
    const formatted = formatGatheringDate("2026-11-20");
    // "Sexta, 20 de novembro de 2026"
    expect(formatted).toMatch(/20 de novembro/i);
    expect(formatted).toMatch(/2026/);
  });

  it("returns raw text unchanged when date is not in YYYY-MM-DD format", () => {
    expect(formatGatheringDate("Próxima sexta às 20h")).toBe("Próxima sexta às 20h");
    expect(formatGatheringDate("A definir")).toBe("A definir");
    expect(formatGatheringDate("")).toBe("");
  });
});
