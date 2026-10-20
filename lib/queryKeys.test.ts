import { describe, expect, it } from "vitest";

import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("keeps every admin list of an event under one prefix, so one invalidation refreshes them all", () => {
    const { admin } = queryKeys;
    const lists = [
      admin.categories("e"), admin.nominationsAll("e"), admin.nominationsPendingCount("e"), admin.nominationsPage("e", 0, 50),
      admin.votesAudit("e"), admin.officialResults("e"), admin.members("e"), admin.membersPage("e", 0, 50), admin.secretSantaState("e"),
    ];

    for (const key of lists) expect(key.slice(0, 3)).toEqual(admin.all("e"));
  });

  it("does not mix the admin lists of two events", () => {
    expect(queryKeys.admin.votesAudit("other").slice(0, 3)).not.toEqual(queryKeys.admin.all("e"));
  });

  it("keeps the proposal lists under the proposals prefix of their event", () => {
    expect(queryKeys.admin.categoryProposals("e").slice(0, 3)).toEqual(queryKeys.admin.proposals("e"));
    expect(queryKeys.admin.measureProposals("e").slice(0, 3)).toEqual(queryKeys.admin.proposals("e"));
  });

  it("lets a page key be refreshed from its list prefix", () => {
    expect(queryKeys.admin.membersPage("e", 0, 50).slice(0, 4)).toEqual(queryKeys.admin.members("e"));
  });

  it("refreshes the member list after any admin write, since it changes who the mural and the wishlist show", () => {
    expect(queryKeys.admin.afterWrite("e")).toContainEqual(queryKeys.eventMembers("e"));
  });
});
