import { describe, expect, it } from "vitest";
import {
  computeStoryExpiry,
  groupStoriesByAuthor,
  hasReachedStoryLimit,
  isStoryRequestTooLarge,
  parseContentLength,
  isStoryKeyForEvent,
  MAX_ACTIVE_STORIES_PER_USER,
  MAX_STORY_BYTES,
  MAX_STORY_REQUEST_BYTES,
  STORY_LIFETIME_MS,
} from "./storyRules";

const NOW = new Date("2026-10-27T10:00:00.000Z");

describe("computeStoryExpiry", () => {
  it("expires exactly 24 hours after the given instant", () => {
    expect(computeStoryExpiry(NOW).toISOString()).toBe("2026-10-28T10:00:00.000Z");
    expect(STORY_LIFETIME_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("does not change the date it receives", () => {
    const before = NOW.getTime();
    computeStoryExpiry(NOW);
    expect(NOW.getTime()).toBe(before);
  });
});

describe("hasReachedStoryLimit", () => {
  it("allows a new story up to the tenth", () => {
    expect(MAX_ACTIVE_STORIES_PER_USER).toBe(10);
    expect(hasReachedStoryLimit(9)).toBe(false);
  });

  it("blocks from ten active stories on", () => {
    expect(hasReachedStoryLimit(10)).toBe(true);
    expect(hasReachedStoryLimit(11)).toBe(true);
  });
});

describe("isStoryKeyForEvent", () => {
  it.each(["stories/event-1/0a1b2c3d.webp", "stories/event-1/0a1b2c3d.jpg", "stories/event-1/0a1b2c3d.png"])(
    "accepts %s",
    (key) => {
      expect(isStoryKeyForEvent(key, "event-1")).toBe(true);
    },
  );

  it.each([
    ["another event", "stories/event-2/0a1b2c3d.webp"],
    ["the feed prefix", "feed/event-1/0a1b2c3d.webp"],
    ["an uploads url", "/uploads/stories/event-1/0a1b2c3d.webp"],
    ["a leading slash", "/stories/event-1/0a1b2c3d.webp"],
    ["a parent segment", "stories/event-1/../event-2/0a1b2c3d.webp"],
    ["extra depth", "stories/event-1/nested/0a1b2c3d.webp"],
    ["a gif", "stories/event-1/0a1b2c3d.gif"],
    ["no extension", "stories/event-1/0a1b2c3d"],
    ["an empty file name", "stories/event-1/"],
    ["an empty key", ""],
  ])("rejects %s", (_label, key) => {
    expect(isStoryKeyForEvent(key, "event-1")).toBe(false);
  });

  it("rejects an event id that is not a safe path segment", () => {
    expect(isStoryKeyForEvent("stories/a/b/0a1b.webp", "a/b")).toBe(false);
    expect(isStoryKeyForEvent("stories/../0a1b.webp", "..")).toBe(false);
  });
});

describe("isStoryRequestTooLarge", () => {
  it("leaves room in the request for the form around a 4 MB image", () => {
    expect(MAX_STORY_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_STORY_REQUEST_BYTES).toBeGreaterThan(MAX_STORY_BYTES);
    expect(MAX_STORY_REQUEST_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });

  it("accepts a request up to the limit and rejects one byte over", () => {
    expect(isStoryRequestTooLarge(MAX_STORY_REQUEST_BYTES)).toBe(false);
    expect(isStoryRequestTooLarge(MAX_STORY_REQUEST_BYTES + 1)).toBe(true);
  });
});

describe("parseContentLength", () => {
  it("reads the size a request declares", () => {
    expect(parseContentLength("1234")).toBe(1234);
    expect(parseContentLength("0")).toBe(0);
  });

  it.each([null, "", "abc", "-5", "1.5", "12 "])("has no size to read in %j", (header) => {
    expect(parseContentLength(header)).toBeNull();
  });
});

describe("groupStoriesByAuthor", () => {
  type Author = { id: string; displayName: string | null; email: string; color: string };
  const ana: Author = { id: "ana", displayName: "Ana", email: "ana@canhoes.pt", color: "coral" };
  const rui: Author = { id: "rui", displayName: null, email: "rui.silva@canhoes.pt", color: "teal" };
  const story = (id: string, author: Author, createdAt: string) => ({
    id,
    author,
    createdAtUtc: new Date(createdAt),
    expiresAtUtc: new Date("2026-10-28T10:00:00.000Z"),
  });

  it("puts each member's stories together, oldest first, so they play in order", () => {
    const groups = groupStoriesByAuthor("event-1", [
      story("a2", ana, "2026-10-27T09:00:00.000Z"),
      story("a1", ana, "2026-10-27T07:00:00.000Z"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.stories.map(({ id }) => id)).toEqual(["a1", "a2"]);
  });

  it("lists first the member who posted most recently", () => {
    const groups = groupStoriesByAuthor("event-1", [
      story("a1", ana, "2026-10-27T07:00:00.000Z"),
      story("r1", rui, "2026-10-27T08:00:00.000Z"),
      story("a2", ana, "2026-10-27T06:00:00.000Z"),
    ]);

    expect(groups.map(({ authorUserId }) => authorUserId)).toEqual(["rui", "ana"]);
  });

  it("points each story at the authenticated media route and gives dates as text", () => {
    const [group] = groupStoriesByAuthor("event-1", [story("a1", ana, "2026-10-27T07:00:00.000Z")]);

    expect(group?.stories[0]).toEqual({
      id: "a1",
      createdAtUtc: "2026-10-27T07:00:00.000Z",
      expiresAtUtc: "2026-10-28T10:00:00.000Z",
      mediaUrl: "/api/v1/events/event-1/stories/a1/media",
    });
  });

  it("names a member without a display name by the start of their email, and keeps the colour", () => {
    const [group] = groupStoriesByAuthor("event-1", [story("r1", rui, "2026-10-27T08:00:00.000Z")]);

    expect(group).toMatchObject({ authorName: "rui.silva", authorColor: "teal" });
  });

  it("returns nothing when there are no stories", () => {
    expect(groupStoriesByAuthor("event-1", [])).toEqual([]);
  });
});
