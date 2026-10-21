import { describe, expect, it } from "vitest";

import {
  ConfirmGatheringDateSchema,
  CreateFeedPostSchema,
  SubmitGatheringRsvpSchema,
  VoteGatheringDateSchema,
} from "./feed";

describe("CreateFeedPostSchema", () => {
  it("accepts a text post with images, a complete poll and gathering", () => {
    const result = CreateFeedPostSchema.safeParse({
      text: "  Jantar de Natal  ",
      mediaUrls: ["/api/uploads/feed/event/photo.webp"],
      pollQuestion: "Onde vamos jantar?",
      pollOptions: ["Porto", "Braga"],
      gatheringTitle: "Jantar",
      gatheringLocation: "Baixa",
      gatheringDates: ["19 Dezembro", "20 Dezembro"],
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

describe("Gathering Schemas", () => {
  it("validates VoteGatheringDateSchema", () => {
    expect(VoteGatheringDateSchema.safeParse({ optionId: "opt-1" }).success).toBe(true);
    expect(VoteGatheringDateSchema.safeParse({ optionId: "" }).success).toBe(false);
  });

  it("validates ConfirmGatheringDateSchema", () => {
    expect(ConfirmGatheringDateSchema.safeParse({ dateText: "19 Dezembro" }).success).toBe(true);
    expect(ConfirmGatheringDateSchema.safeParse({ dateText: "" }).success).toBe(false);
  });

  it("validates SubmitGatheringRsvpSchema", () => {
    expect(SubmitGatheringRsvpSchema.safeParse({ status: "GOING", note: "Levo sobremesa" }).success).toBe(true);
    expect(SubmitGatheringRsvpSchema.safeParse({ status: "NOT_GOING" }).success).toBe(true);
    expect(SubmitGatheringRsvpSchema.safeParse({ status: "MAYBE" }).success).toBe(true);
    expect(SubmitGatheringRsvpSchema.safeParse({ status: "INVALID" }).success).toBe(false);
  });
});
