import { describe, expect, it } from "vitest";

import { CANHOES_MODULES } from "./modules";

describe("CANHOES_MODULES", () => {
  it("gives every area its own icon, so one icon always means one area", () => {
    const icons = CANHOES_MODULES.map((module) => module.icon);

    expect(new Set(icons).size).toBe(icons.length);
  });
});
