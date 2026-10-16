import { describe, expect, it } from "vitest";

import { formatMessage } from "./messages";

describe("formatMessage", () => {
  it("fills every placeholder", () => {
    expect(formatMessage("{name} votou em {category}.", { name: "Ana", category: "Gala" })).toBe("Ana votou em Gala.");
  });

  it("keeps unknown placeholders visible", () => {
    expect(formatMessage("Olá {name}", {})).toBe("Olá {name}");
  });
});

