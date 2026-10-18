import { describe, expect, it } from "vitest";

import { absMediaUrl } from "./media";

describe("absMediaUrl", () => {
  it.each([
    [null, ""],
    ["   ", ""],
    ["/uploads/feed/a.jpg", "/api/uploads/feed/a.jpg"],
    ["uploads/feed/a.jpg", "/api/uploads/feed/a.jpg"],
    ["\\uploads\\feed\\a.jpg", "/api/uploads/feed/a.jpg"],
    ["/api/uploads/feed/a.jpg", "/api/uploads/feed/a.jpg"],
    ["https://canhoes.pt/uploads/feed/a.jpg?v=2", "/api/uploads/feed/a.jpg?v=2"],
    ["https://cdn.example.com/a.jpg", "https://cdn.example.com/a.jpg"],
    ["/images/logo.png", "/images/logo.png"],
    ["images/logo.png", "/images/logo.png"],
  ])("%s → %s", (path, expected) => {
    expect(absMediaUrl(path)).toBe(expected);
  });
});
