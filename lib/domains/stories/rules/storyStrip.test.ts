import { describe, expect, it } from "vitest";

import type { PublicUserDto, StoryAuthorDto } from "@/lib/api/types";

import { buildStripItems } from "./storyStrip";

const member = (id: string, displayName: string | null, color = "teal"): PublicUserDto => ({
  id,
  email: `${id}@canhoes.pt`,
  displayName,
  isAdmin: false,
  color,
});
const group = (authorUserId: string, authorName: string, authorColor = "coral"): StoryAuthorDto => ({
  authorUserId,
  authorName,
  authorColor,
  stories: [
    {
      id: `${authorUserId}-1`,
      createdAtUtc: "2026-10-27T10:00:00.000Z",
      expiresAtUtc: "2026-10-28T10:00:00.000Z",
      mediaUrl: `/api/v1/events/e/stories/${authorUserId}-1/media`,
    },
  ],
});

describe("buildStripItems", () => {
  it("lists first the members with stories, in the order of the stories, and then the others in their own order", () => {
    const items = buildStripItems(
      [member("ana", "Ana"), member("rui", "Rui"), member("eva", "Eva"), member("zeca", "Zeca")],
      [group("eva", "Eva"), group("rui", "Rui")],
    );

    expect(items.map(({ userId }) => userId)).toEqual(["eva", "rui", "ana", "zeca"]);
    expect(items.map(({ group: itsStories }) => itsStories !== null)).toEqual([true, true, false, false]);
  });

  it("names a member as the rest of the app does and keeps their colour", () => {
    const [byName, byEmail] = buildStripItems([member("ana", "Ana Silva", "pink"), member("rui", null, "lime")], []);

    expect(byName).toMatchObject({ name: "Ana Silva", color: "pink" });
    expect(byEmail).toMatchObject({ name: "rui", color: "lime" });
  });

  it("still shows an author who is not a member, such as an admin", () => {
    const items = buildStripItems([member("ana", "Ana")], [group("boss", "Chefe", "violet")]);

    expect(items.map(({ userId, name, color }) => [userId, name, color])).toEqual([
      ["boss", "Chefe", "violet"],
      ["ana", "Ana", "teal"],
    ]);
  });

  it("is empty when there is nobody", () => {
    expect(buildStripItems([], [])).toEqual([]);
  });
});
