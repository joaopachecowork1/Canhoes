import { describe, expect, it } from "vitest";

import type { EventModulesDto } from "@/lib/api/types";

import { getNavigation } from "./canhoesNavigation";

const allClosed: EventModulesDto = {
  feed: true,
  nominees: false,
  categories: false,
  secretSanta: false,
  wishlist: false,
  voting: false,
  stickers: false,
  measures: false,
  gala: false,
  admin: false,
};
const listed = (modules: EventModulesDto) => {
  const { dockItems, menuItems } = getNavigation({ ...allClosed, ...modules });
  return [...dockItems, ...menuItems].map((item) => item.id);
};

describe("getNavigation", () => {
  it("lists stickers and measures under their parent area when it is open", () => {
    expect(listed({ nominees: true, stickers: true, categories: true, measures: true })).toEqual([
      "nominees",
      "categories",
    ]);
  });

  it("lists them on their own when the parent area is switched off", () => {
    expect(listed({ stickers: true, measures: true })).toEqual(["stickers", "measures"]);
  });

  it("marks the parent area as active on its siblings' pages", () => {
    const { dockItems } = getNavigation({ ...allClosed, nominees: true, stickers: true });
    expect(dockItems[0].alsoActiveFor).toEqual(["/canhoes/stickers"]);
  });
});
