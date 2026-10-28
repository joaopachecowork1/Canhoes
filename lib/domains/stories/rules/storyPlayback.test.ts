import { describe, expect, it } from "vitest";

import type { StoryAuthorDto } from "@/lib/api/types";

import {
  findStoryPosition,
  nextAuthorPosition,
  nextStoryPosition,
  previousAuthorPosition,
  previousStoryPosition,
  storyAt,
} from "./storyPlayback";

const story = (id: string) => ({
  id,
  createdAtUtc: "2026-10-27T10:00:00.000Z",
  expiresAtUtc: "2026-10-28T10:00:00.000Z",
  mediaUrl: `/api/v1/events/e/stories/${id}/media`,
});
const author = (authorUserId: string, ...ids: string[]): StoryAuthorDto => ({
  authorUserId,
  authorName: authorUserId,
  authorColor: "coral",
  stories: ids.map(story),
});

const groups = [author("ana", "a1", "a2"), author("rui", "r1"), author("eva", "e1", "e2")];

describe("nextStoryPosition", () => {
  it("moves to the next story of the same member", () => {
    expect(nextStoryPosition(groups, { authorIndex: 0, storyIndex: 0 })).toEqual({ authorIndex: 0, storyIndex: 1 });
  });

  it("moves to the first story of the next member after the last one", () => {
    expect(nextStoryPosition(groups, { authorIndex: 0, storyIndex: 1 })).toEqual({ authorIndex: 1, storyIndex: 0 });
  });

  it("ends after the very last story", () => {
    expect(nextStoryPosition(groups, { authorIndex: 2, storyIndex: 1 })).toBeNull();
  });
});

describe("previousStoryPosition", () => {
  it("moves to the previous story of the same member", () => {
    expect(previousStoryPosition(groups, { authorIndex: 2, storyIndex: 1 })).toEqual({ authorIndex: 2, storyIndex: 0 });
  });

  it("moves to the last story of the previous member from the first one", () => {
    expect(previousStoryPosition(groups, { authorIndex: 2, storyIndex: 0 })).toEqual({ authorIndex: 1, storyIndex: 0 });
    expect(previousStoryPosition(groups, { authorIndex: 1, storyIndex: 0 })).toEqual({ authorIndex: 0, storyIndex: 1 });
  });

  it("has nowhere to go before the very first story", () => {
    expect(previousStoryPosition(groups, { authorIndex: 0, storyIndex: 0 })).toBeNull();
  });
});

describe("findStoryPosition", () => {
  it("finds a story wherever it is", () => {
    expect(findStoryPosition(groups, "e2")).toEqual({ authorIndex: 2, storyIndex: 1 });
  });

  it("answers null for a story that is not there any more", () => {
    expect(findStoryPosition(groups, "gone")).toBeNull();
  });
});

describe("storyAt", () => {
  it("returns the story at a position", () => {
    expect(storyAt(groups, { authorIndex: 1, storyIndex: 0 })?.id).toBe("r1");
  });

  it("returns nothing outside the list", () => {
    expect(storyAt(groups, { authorIndex: 5, storyIndex: 0 })).toBeUndefined();
  });
});

describe("nextAuthorPosition", () => {
  it("jumps to the first story of the next member, skipping the rest of the current one", () => {
    expect(nextAuthorPosition(groups, { authorIndex: 0, storyIndex: 0 })).toEqual({ authorIndex: 1, storyIndex: 0 });
  });

  it("is null for the last member", () => {
    expect(nextAuthorPosition(groups, { authorIndex: 2, storyIndex: 1 })).toBeNull();
  });
});

describe("previousAuthorPosition", () => {
  it("jumps to the first story of the previous member", () => {
    expect(previousAuthorPosition(groups, { authorIndex: 2, storyIndex: 1 })).toEqual({
      authorIndex: 1,
      storyIndex: 0,
    });
  });

  it("is null for the first member", () => {
    expect(previousAuthorPosition(groups, { authorIndex: 0, storyIndex: 1 })).toBeNull();
  });
});
