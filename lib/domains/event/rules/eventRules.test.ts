import { describe, expect, it } from "vitest";

import { readModuleSwitches, resolveMemberModules, type EventRulesState } from "./eventRules";

function openModules(state: Partial<EventRulesState>) {
  const modules = resolveMemberModules({
    activePhaseType: null,
    moduleVisibility: {},
    nominationsVisible: true,
    hasSecretSantaDraw: false,
    ...state,
  });
  return Object.keys(modules).filter((key) => modules[key]).sort();
}

describe("resolveMemberModules", () => {
  it("opens the secret santa and the always-on areas in the draw", () => {
    expect(openModules({ activePhaseType: "DRAW" })).toEqual(["feed", "secretSanta", "wishlist"]);
  });

  it("opens every proposal area while proposals are accepted", () => {
    expect(openModules({ activePhaseType: "PROPOSALS" })).toEqual([
      "categories", "feed", "measures", "nominees", "stickers", "wishlist",
    ]);
  });

  it("closes the proposal areas when the admin stops accepting proposals", () => {
    expect(openModules({ activePhaseType: "PROPOSALS", nominationsVisible: false })).toEqual(["feed", "wishlist"]);
  });

  it("opens only the ballot in voting and only the gala in results, besides the always-on areas", () => {
    expect(openModules({ activePhaseType: "VOTING" })).toEqual(["feed", "secretSanta", "voting", "wishlist"]);
    expect(openModules({ activePhaseType: "RESULTS" })).toEqual(["feed", "gala", "secretSanta", "wishlist"]);
  });

  it("keeps a module the admin switched off closed in every phase", () => {
    expect(openModules({ activePhaseType: "VOTING", moduleVisibility: { voting: false } })).not.toContain("voting");
  });
});

describe("readModuleSwitches", () => {
  it("keeps only on/off values of a saved object", () => {
    expect(readModuleSwitches({ feed: false, stickers: true, gala: "yes" })).toEqual({ feed: false, stickers: true });
  });

  it.each([null, undefined, "feed", [true], 3])("reads %o as no switches", (value) => {
    expect(readModuleSwitches(value)).toEqual({});
  });
});
