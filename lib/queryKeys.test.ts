import { describe, expect, it } from "vitest";

import { QueryClient } from "@tanstack/react-query";

import { invalidateAfterAdminWrite, invalidatePersonColor, queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("keeps every admin list of an event under one prefix, so one invalidation refreshes them all", () => {
    const { admin } = queryKeys;
    const lists = [
      admin.categories("e"),
      admin.nominationsAll("e"),
      admin.nominationsPendingCount("e"),
      admin.nominationsPage("e", 0, 50),
      admin.votesAudit("e"),
      admin.officialResults("e"),
      admin.members("e"),
      admin.membersPage("e", 0, 50),
      admin.invites("e"),
      admin.secretSantaState("e"),
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

  it("keeps the nominations of the user next to the other nomination keys", () => {
    expect(queryKeys.nominationsMine("e")).toEqual(["nominations", "e", "my-status"]);
  });
});

/** A client with one cached query per key, to see which ones a refresh marks as stale. */
function clientWith(keys: readonly (readonly unknown[])[]) {
  const queryClient = new QueryClient();
  for (const key of keys) queryClient.setQueryData(key, "cached");
  const isStale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated === true;
  return { queryClient, isStale };
}

describe("invalidateAfterAdminWrite", () => {
  it("refreshes every admin list of the event and the member list, since an admin write changes who the app shows", async () => {
    const keys = [
      queryKeys.admin.members("e"),
      queryKeys.admin.bootstrap("e"),
      queryKeys.admin.categoryProposals("e"),
      queryKeys.eventMembers("e"),
    ];
    const { queryClient, isStale } = clientWith([...keys, queryKeys.admin.members("other"), queryKeys.categories("e")]);

    await invalidateAfterAdminWrite(queryClient, "e");

    for (const key of keys) expect(isStale(key)).toBe(true);
    expect(isStale(queryKeys.admin.members("other"))).toBe(false);
    expect(isStale(queryKeys.categories("e"))).toBe(false);
  });
});

describe("invalidatePersonColor", () => {
  it("refreshes the lists that show a person's colour and leaves the others alone", async () => {
    const shown = [queryKeys.hubPosts("e"), queryKeys.hubComments("p"), queryKeys.eventMembers("e")];
    const { queryClient, isStale } = clientWith([...shown, queryKeys.categories("e")]);

    await invalidatePersonColor(queryClient);

    for (const key of shown) expect(isStale(key)).toBe(true);
    expect(isStale(queryKeys.categories("e"))).toBe(false);
  });
});
