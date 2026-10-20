import { describe, expect, it, vi } from "vitest";

import { loadUsersById } from "./usersById";

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
