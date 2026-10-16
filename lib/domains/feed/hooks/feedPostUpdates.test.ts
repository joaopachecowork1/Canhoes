import { describe, expect, it } from "vitest";

import type { EventFeedPostFullDto, HubCommentDto } from "@/lib/api/types";
import { HEART_REACTION } from "@/lib/reactions";

import { makePost } from "./feedTestFixtures";
import {
  applyCommentReaction,
  applyDownvote,
  applyPollVote,
  applyPostReaction,
  applyServerDownvote,
  applyServerLike,
  changeCommentCount,
} from "./feedPostUpdates";

const post = (overrides: Partial<EventFeedPostFullDto> = {}) => ({ ...makePost("p"), ...overrides });

describe("applyPostReaction", () => {
  it("adds and removes an emoji reaction", () => {
    const reacted = applyPostReaction(post(), "🔥");
    expect(reacted.myReactions).toEqual(["🔥"]);
    expect(reacted.reactionCounts["🔥"]).toBe(1);
    expect(applyPostReaction(reacted, "🔥").reactionCounts["🔥"]).toBe(0);
  });

  it("likes with the heart and cancels an active downvote", () => {
    const liked = applyPostReaction(post({ downvotedByMe: true, downvoteCount: 1 }), HEART_REACTION);
    expect(liked).toMatchObject({ likedByMe: true, likeCount: 1, downvotedByMe: false, downvoteCount: 0 });
  });

  it("reads the heart state from likedByMe", () => {
    const unliked = applyPostReaction(post({ likedByMe: true, likeCount: 1 }), HEART_REACTION);
    expect(unliked).toMatchObject({ likedByMe: false, likeCount: 0 });
  });
});

describe("applyServerLike", () => {
  it("keeps the heart in myReactions in line with the server", () => {
    expect(applyServerLike(post(), true).myReactions).toEqual([HEART_REACTION]);
    expect(applyServerLike(post({ myReactions: [HEART_REACTION] }), false).myReactions).toEqual([]);
  });
});

describe("applyDownvote", () => {
  it("downvotes and cancels an active like", () => {
    const downvoted = applyDownvote(post({ likedByMe: true, likeCount: 2 }));
    expect(downvoted).toMatchObject({ downvotedByMe: true, downvoteCount: 1, likedByMe: false, likeCount: 1 });
  });

  it("removes an existing downvote", () => {
    expect(applyDownvote(post({ downvotedByMe: true, downvoteCount: 1 }))).toMatchObject({ downvotedByMe: false, downvoteCount: 0 });
  });
});

describe("applyServerDownvote", () => {
  it("does not count the same downvote twice", () => {
    expect(applyServerDownvote(post({ downvotedByMe: true, downvoteCount: 1 }), true).downvoteCount).toBe(1);
    expect(applyServerDownvote(post({ downvotedByMe: false, downvoteCount: 1 }), true).downvoteCount).toBe(2);
  });
});

describe("applyPollVote", () => {
  const withPoll = (myOptionId: string | null) =>
    post({
      poll: {
        question: "?",
        myOptionId,
        totalVotes: myOptionId ? 1 : 0,
        options: [
          { id: "a", text: "A", voteCount: myOptionId === "a" ? 1 : 0 },
          { id: "b", text: "B", voteCount: myOptionId === "b" ? 1 : 0 },
        ],
      },
    });

  it("casts a first vote", () => {
    expect(applyPollVote(withPoll(null), "a").poll).toMatchObject({ myOptionId: "a", totalVotes: 1 });
  });

  it("moves a vote without changing the total", () => {
    const moved = applyPollVote(withPoll("a"), "b").poll;
    expect(moved?.totalVotes).toBe(1);
    expect(moved?.options.map((option) => option.voteCount)).toEqual([0, 1]);
  });

  it("removes the vote when the same option is chosen again", () => {
    expect(applyPollVote(withPoll("a"), "a").poll).toMatchObject({ myOptionId: null, totalVotes: 0 });
  });

  it("ignores posts without a poll", () => {
    const plain = post();
    expect(applyPollVote(plain, "a")).toBe(plain);
  });
});

describe("comment updates", () => {
  const comment: HubCommentDto = {
    id: "c",
    postId: "p",
    userId: "u",
    userName: "Ana",
    text: "",
    createdAtUtc: "2026-01-01T00:00:00.000Z",
    replyToId: null,
    reactionCounts: {},
    myReactions: [],
  };

  it("toggles a reaction on a comment", () => {
    const reacted = applyCommentReaction(comment, "😂");
    expect(reacted).toMatchObject({ myReactions: ["😂"], reactionCounts: { "😂": 1 } });
    expect(applyCommentReaction(reacted, "😂").reactionCounts["😂"]).toBe(0);
  });

  it("never counts below zero comments", () => {
    expect(changeCommentCount(post(), -1).commentCount).toBe(0);
    expect(changeCommentCount(post(), 1).commentCount).toBe(1);
  });
});
