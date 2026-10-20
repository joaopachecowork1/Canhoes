/*
 * Every TanStack Query key of the app, so the screen that reads a list and the code that refreshes it
 * after a write cannot spell it differently. Keys that take an event id start with the same prefix, so
 * invalidating the prefix refreshes every variant (pages, filters).
 */
/** The event of the current page, which is not known until the overview has loaded. */
type EventId = string | null | undefined;

export const queryKeys = {
  eventOverview: ["eventOverview"] as const,
  eventMembers: (eventId: EventId) => ["eventMembers", eventId] as const,
  hubPosts: (eventId: EventId) => ["hub-posts", eventId] as const,
  hubComments: (postId: string) => ["hub-comments", postId] as const,
  wishlistItems: (eventId: EventId) => ["wishlistItems", eventId] as const,
  secretSantaOverview: (eventId: EventId) => ["secretSantaOverview", eventId] as const,
  secretSantaWishlist: (eventId: EventId) => ["secretSantaWishlist", eventId] as const,
  categories: (eventId: EventId) => ["categories", eventId] as const,
  measures: (eventId: EventId) => ["measures", eventId] as const,
  galaResults: (eventId: EventId) => ["galaResults", eventId] as const,
  stickerCategories: (eventId: EventId) => ["stickerCategories", eventId] as const,
  approvedNominees: (eventId: EventId) => ["approvedNominees", eventId] as const,
  officialVoting: (eventId: EventId) => ["official-voting", eventId ?? ""] as const,
  nominationCategories: (eventId: string) => ["nominations", eventId, "categories"] as const,
  nominationsApproved: (eventId: string) => ["nominations", eventId, "approved"] as const,
  /**
   * The cached lists that show a person's colour: `authorColor` on posts and comments, `PublicUserDto.color` on the member lists
   * (mural strip, wishlist, admin). Refreshed when someone changes theirs; a new screen that shows a colour must add its root here.
   */
  colorRoots: ["hub-posts", "hub-comments", "eventMembers", "canhoes"] as readonly unknown[],
  admin: {
    /** Every admin query of one event except `bootstrap` and `proposals`: one invalidation refreshes them all. */
    all: (eventId: EventId) => ["canhoes", "admin", eventId] as const,
    bootstrap: (eventId: EventId) => ["adminBootstrap", eventId] as const,
    proposals: (eventId: EventId) => ["admin", "proposals", eventId] as const,
    categoryProposals: (eventId: EventId) => ["admin", "proposals", eventId, "categories", "pending"] as const,
    measureProposals: (eventId: EventId) => ["admin", "proposals", eventId, "measures", "pending"] as const,
    categories: (eventId: EventId) => ["canhoes", "admin", eventId, "categories"] as const,
    nominationsAll: (eventId: EventId) => ["canhoes", "admin", eventId, "nominations", "all"] as const,
    nominationsPendingCount: (eventId: EventId) =>
      ["canhoes", "admin", eventId, "nominations", "pending-count"] as const,
    nominationsPage: (eventId: EventId, page: number, pageSize: number) =>
      ["canhoes", "admin", eventId, "nominations", page, pageSize, "pending"] as const,
    votesAudit: (eventId: EventId) => ["canhoes", "admin", eventId, "votes-audit"] as const,
    officialResults: (eventId: EventId) => ["canhoes", "admin", eventId, "official-results"] as const,
    members: (eventId: EventId) => ["canhoes", "admin", eventId, "members"] as const,
    membersPage: (eventId: EventId, skip: number, take: number) =>
      ["canhoes", "admin", eventId, "members", skip, take] as const,
    secretSantaState: (eventId: EventId) => ["canhoes", "admin", eventId, "secret-santa-state"] as const,
    /** What to invalidate after any admin write, so every tab of that event is fresh. */
    afterWrite: (eventId: EventId) =>
      [
        ["canhoes", "admin", eventId],
        ["adminBootstrap", eventId],
        ["admin", "proposals", eventId],
        ["eventMembers", eventId],
      ] as const,
  },
};
