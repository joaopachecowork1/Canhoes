import { describe, expect, it } from "vitest";

import { CreateWishlistItemSchema } from "./wishlist";

const withUrl = (url: unknown) => CreateWishlistItemSchema.safeParse({ title: "Livro", url }).success;

describe("CreateWishlistItemSchema", () => {
  it.each(["https://loja.example/livro", "http://loja.example/livro", "HTTPS://LOJA.EXAMPLE"])(
    "accepts the web link %s",
    (url) => {
      expect(withUrl(url)).toBe(true);
    },
  );

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<b>x</b>",
    "ftp://loja.example/livro",
    "loja.example/livro",
  ])("refuses %s, which would be a script or a broken link once shown as a link", (url) => {
    expect(withUrl(url)).toBe(false);
  });

  it("still lets the link be left out", () => {
    expect(withUrl(null)).toBe(true);
    expect(withUrl(undefined)).toBe(true);
  });
});
