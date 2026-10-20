import { describe, expect, it } from "vitest";

import { POST as votePoll } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/poll/vote/route";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, signInAs } from "./helpers";

async function setupPoll() {
  const event = await createEvent();
  const member = await createMember(event.id);
  const post = await prisma.hubPost.create({
    data: { eventId: event.id, authorUserId: member.id, text: "Carne ou peixe?", isPinned: false },
  });
  const poll = await prisma.hubPostPoll.create({
    data: {
      postId: post.id,
      question: "Carne ou peixe?",
      options: {
        create: [
          { text: "Carne", sortOrder: 0 },
          { text: "Peixe", sortOrder: 1 },
        ],
      },
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  signInAs(member);
  const [first, second] = poll.options;
  const vote = (optionId: string) =>
    callRoute(votePoll, { eventId: event.id, postId: post.id }, { method: "POST", body: { optionId } });
  return { member, first, second, vote };
}

describe("poll vote", () => {
  it("records, switches and removes a vote", async () => {
    const { member, first, second, vote } = await setupPoll();

    expect((await vote(first.id)).status).toBe(200);
    expect((await vote(second.id)).status).toBe(200);
    expect(await prisma.hubPostPollVote.findMany({ select: { userId: true, optionId: true } })).toEqual([
      { userId: member.id, optionId: second.id },
    ]);

    expect((await vote(second.id)).status).toBe(200);
    expect(await prisma.hubPostPollVote.count()).toBe(0);
  });

  // Regression: quick taps send overlapping requests, and the read-then-write vote used to fail
  // with a 500 (unique constraint on the first vote, "record not found" when switching).
  it("handles overlapping votes from the same member without a server error", async () => {
    const { first, second, vote } = await setupPoll();

    const firstVotes = await Promise.all([vote(first.id), vote(second.id), vote(first.id), vote(second.id)]);
    const switches = await Promise.all([vote(first.id), vote(second.id), vote(first.id), vote(second.id)]);

    expect([...firstVotes, ...switches].map((response) => response.status)).toEqual(Array(8).fill(200));
    expect(await prisma.hubPostPollVote.count()).toBeLessThanOrEqual(1);
  });
});
