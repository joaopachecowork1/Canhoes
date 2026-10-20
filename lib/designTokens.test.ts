import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve("app/globals.css"), "utf8");

/** The value of a custom property in the :root block, following one `var(--other)` alias. */
function tokenValue(name: string): string {
  const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim() ?? "";
  const alias = /^var\(--([\w-]+)\)$/.exec(value);
  return alias?.[1] ? tokenValue(alias[1]) : value.toLowerCase();
}

describe("design tokens", () => {
  it("gives every area a colour of its own, never a person's frame colour", () => {
    const people = ["coral", "amber", "teal", "blue", "pink", "lime", "violet", "sky"].map((key) =>
      tokenValue(`person-${key}`),
    );
    const areas = [
      "feed",
      "voting",
      "nominees",
      "categories",
      "gala",
      "secret-santa",
      "wishlist",
      "stickers",
      "measures",
    ];

    for (const area of areas) {
      const value = tokenValue(`area-${area}`);
      expect(value, `--area-${area}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(people, `--area-${area} reuses a person colour`).not.toContain(value);
    }
  });

  it("keeps the area colours apart from each other", () => {
    const areas = [
      "feed",
      "voting",
      "nominees",
      "categories",
      "gala",
      "secret-santa",
      "wishlist",
      "stickers",
      "measures",
    ];
    const values = areas.map((area) => tokenValue(`area-${area}`));

    expect(new Set(values).size).toBe(areas.length);
  });
});
