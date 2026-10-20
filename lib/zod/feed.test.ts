import { describe, expect, it } from "vitest";

import { CreateFeedPostSchema } from "./feed";

describe("CreateFeedPostSchema", () => {
  it("accepts a text post with images and a complete poll", () => {
    const result = CreateFeedPostSchema.safeParse({
      text: "  Jantar de Natal  ",
      mediaUrls: ["/api/uploads/feed/event/photo.webp"],
      pollQuestion: "Onde vamos jantar?",
      pollOptions: ["Porto", "Braga"],
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.text).toBe("Jantar de Natal");
  });

  it.each([
    "https://tracker.example/a.png",
    "/uploads/../api/auth/signout",
    "/uploads/%2e%2e/x",
    "/uploads/.\t./api/v1/x.png",
    "/uploads/feed/page.html",
    "/uploads/canhoes/wishlist/a.png",
  ])("rejects the media address %s", (url) => {
    expect(CreateFeedPostSchema.safeParse({ text: "Foto", mediaUrls: [url] }).success).toBe(false);
    expect(CreateFeedPostSchema.safeParse({ text: "Foto", mediaUrl: url }).success).toBe(false);
  });

  it("rejects an incomplete poll", () => {
    const result = CreateFeedPostSchema.safeParse({
      text: "Escolham",
      pollQuestion: "Onde?",
      pollOptions: ["Porto"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate poll options", () => {
    const result = CreateFeedPostSchema.safeParse({
      text: "Escolham",
      pollQuestion: "Onde?",
      pollOptions: ["Porto", "porto"],
    });

    expect(result.success).toBe(false);
  });
});
