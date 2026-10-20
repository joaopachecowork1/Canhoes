import { describe, expect, it } from "vitest";

import type { EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";

import { groupWishlistItemsByUser, pickSelectedMemberId } from "./wishlistRules";

const member = (id: string): PublicUserDto => ({
  id,
  email: `${id}@canhoes.pt`,
  displayName: id,
  isAdmin: false,
  color: "teal",
});
const item = (id: string, userId: string, updatedAtUtc: string): EventWishlistItemDto => ({
  id,
  userId,
  updatedAtUtc,
  eventId: "e",
  title: id,
  url: null,
  notes: null,
  imageUrl: null,
});

describe("pickSelectedMemberId", () => {
  const members = [member("ana"), member("rui")];

  it("keeps the picked member while it exists", () => {
    expect(pickSelectedMemberId("rui", members, "ana")).toBe("rui");
  });

  it("falls back to your own list, then to the first member", () => {
    expect(pickSelectedMemberId("gone", members, "rui")).toBe("rui");
    expect(pickSelectedMemberId(null, members, "stranger")).toBe("ana");
  });

  it("has nothing to pick without members", () => {
    expect(pickSelectedMemberId("ana", [], "ana")).toBeNull();
  });
});

describe("groupWishlistItemsByUser", () => {
  it("groups by member with the newest first", () => {
    const grouped = groupWishlistItemsByUser([
      item("old", "ana", "2026-01-01"),
      item("new", "ana", "2026-02-01"),
      item("other", "rui", "2026-01-15"),
    ]);
    expect(grouped.get("ana")?.map((entry) => entry.id)).toEqual(["new", "old"]);
    expect(grouped.get("rui")).toHaveLength(1);
  });
});
