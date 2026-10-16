import type { EventFeedPostFullDto } from "@/lib/api/types";

/** A post with every count at zero, for tests of the feed cache. */
export function makePost(id: string): EventFeedPostFullDto {
  return {
    id,
    eventId: "event",
    authorUserId: "author",
    authorName: "Autor",
    text: "",
    mediaUrl: null,
    mediaUrls: [],
    isPinned: false,
    pinnedOrder: null,
    createdAtUtc: "2026-01-01T00:00:00.000Z",
    likeCount: 0,
    commentCount: 0,
    downvoteCount: 0,
    reactionCounts: {},
    myReactions: [],
    likedByMe: false,
    downvotedByMe: false,
    poll: null,
  };
}
