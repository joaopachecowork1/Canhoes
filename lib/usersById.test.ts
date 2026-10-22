import { describe, expect, it, vi } from "vitest";

import { compareMembersByRoleAndName, loadUsersById } from "./usersById";

describe("loadUsersById", () => {
  it("asks once for each distinct id and returns the rows by id", async () => {
    const query = vi.fn(async () => [
      { id: "a", name: "Ana" },
      { id: "b", name: "Rui" },
    ]);

    const users = await loadUsersById(["a", "b", "a"], query);

    expect(query).toHaveBeenCalledWith({ id: { in: ["a", "b"] } });
    expect(users.get("b")).toEqual({ id: "b", name: "Rui" });
    expect(users.size).toBe(2);
  });

  it("does not query for an empty list of ids", async () => {
    const query = vi.fn(async () => [{ id: "a" }]);

    const users = await loadUsersById([], query);

    expect(query).not.toHaveBeenCalled();
    expect(users.size).toBe(0);
  });
});

describe("compareMembersByRoleAndName", () => {
  it("sorts admins before non-admins", () => {
    const admin = { isAdmin: true, displayName: "Ze", email: "ze@canhoes.pt" };
    const member = { isAdmin: false, displayName: "Ana", email: "ana@canhoes.pt" };

    expect(compareMembersByRoleAndName(admin, member)).toBeLessThan(0);
    expect(compareMembersByRoleAndName(member, admin)).toBeGreaterThan(0);
  });

  it("sorts by display name when roles are identical", () => {
    const ana = { isAdmin: false, displayName: "Ana", email: "ana@canhoes.pt" };
    const rui = { isAdmin: false, displayName: "Rui", email: "rui@canhoes.pt" };

    expect(compareMembersByRoleAndName(ana, rui)).toBeLessThan(0);
    expect(compareMembersByRoleAndName(rui, ana)).toBeGreaterThan(0);
  });

  it("falls back to email when display name is null", () => {
    const userWithoutName = { isAdmin: false, displayName: null, email: "ana@canhoes.pt" };
    const rui = { isAdmin: false, displayName: "Rui", email: "rui@canhoes.pt" };

    expect(compareMembersByRoleAndName(userWithoutName, rui)).toBeLessThan(0);
  });
});
