import { describe, expect, it } from "vitest";

import { pickDashboardModules } from "./homeDashboard";

const keys = (modules: { key: string }[]) => modules.map((module) => module.key);

describe("pickDashboardModules", () => {
  it("puts the area of the active phase first", () => {
    const { nextStep } = pickDashboardModules({ voting: true, wishlist: true }, "VOTING");
    expect(nextStep?.key).toBe("voting");
  });

  it("falls back to the wishlist when the phase area is closed", () => {
    const { nextStep } = pickDashboardModules({ voting: false, wishlist: true }, "VOTING");
    expect(nextStep?.key).toBe("wishlist");
  });

  it("has no next step when nothing relevant is open", () => {
    expect(pickDashboardModules({ feed: true }, undefined).nextStep).toBeUndefined();
  });

  it("lists all other areas of the edition with open areas first, never the mural or the next step", () => {
    const { shortcuts } = pickDashboardModules(
      { voting: true, gala: true, secretSanta: true, wishlist: true, stickers: true, feed: true },
      "VOTING",
    );
    expect(shortcuts.length).toBeGreaterThan(0);
    expect(keys(shortcuts)).not.toContain("voting");
    expect(keys(shortcuts)).not.toContain("feed");
    const firstClosed = shortcuts.findIndex((s) => !s.isOpen);
    if (firstClosed !== -1) {
      const openAfterClosed = shortcuts.slice(firstClosed).some((s) => s.isOpen);
      expect(openAfterClosed).toBe(false);
    }
  });
});
